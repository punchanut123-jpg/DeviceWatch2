import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { buildLayoutSnapshot, recordLayoutHistory } from '../services/layoutHistory';

const router = Router();
const prisma = new PrismaClient();

interface DeskInput {
  id?: number;
  label: string;
  x: number | null;
  y: number | null;
}

interface LayoutBody {
  desks?: DeskInput[];
  deleteIds?: number[];
  assignments?: Array<{ deviceId: number; deskIndex: number | null }>;
}

// All routes require JWT auth
router.use(requireAuth);

// GET /api/admin/stats
router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const [totalDevices, totalTickets, openTickets, inProgressTickets, resolvedTickets] =
      await Promise.all([
        prisma.device.count(),
        prisma.ticket.count(),
        prisma.ticket.count({ where: { status: 'open' } }),
        prisma.ticket.count({ where: { status: 'in_progress' } }),
        prisma.ticket.count({ where: { status: 'resolved' } }),
      ]);

    const brokenDevices = await prisma.device.count({ where: { status: 'broken' } });
    const underRepairDevices = await prisma.device.count({ where: { status: 'under_repair' } });

    const recentTickets = await prisma.ticket.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        device: {
          select: {
            name: true,
            room: { select: { name: true } },
          },
        },
      },
    });

    res.json({
      devices: {
        total: totalDevices,
        normal: totalDevices - brokenDevices - underRepairDevices,
        broken: brokenDevices,
        underRepair: underRepairDevices,
      },
      tickets: {
        total: totalTickets,
        open: openTickets,
        inProgress: inProgressTickets,
        resolved: resolvedTickets,
      },
      recentTickets,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/admin/tickets
router.get('/tickets', async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where: status ? { status: status as string } : undefined,
        include: {
          device: {
            select: {
              name: true,
              room: {
                select: {
                  name: true,
                  floor: {
                    select: {
                      number: true,
                      building: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
          student: {
            select: { name: true, studentId: true },
          },
          reportedBy: {
            select: { name: true, studentId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.ticket.count({ where: status ? { status: status as string } : undefined }),
    ]);

    res.json({ tickets, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PATCH /api/admin/tickets/:id
router.patch('/tickets/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body as { status: string };

  const validStatuses = ['open', 'in_progress', 'resolved'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: 'สถานะไม่ถูกต้อง' });
    return;
  }

  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: Number(id) } });
    if (!ticket) {
      res.status(404).json({ error: 'ไม่พบ ticket นี้' });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: Number(id) },
      data: { status },
    });

    // Sync device status with ticket status
    const deviceStatus =
      status === 'resolved' ? 'normal' :
      status === 'in_progress' ? 'under_repair' : 'broken';

    await prisma.device.update({
      where: { id: ticket.deviceId },
      data: { status: deviceStatus },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PATCH /api/admin/reset-device/:id
// รีเซ็ตสถานะเครื่องกลับเป็น normal + ปิด ticket ที่ค้างอยู่ทั้งหมด
router.patch('/reset-device/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const deviceId = Number(req.params.id);
  if (isNaN(deviceId)) {
    res.status(400).json({ error: 'deviceId ไม่ถูกต้อง' });
    return;
  }

  try {
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      res.status(404).json({ error: 'ไม่พบอุปกรณ์นี้' });
      return;
    }

    // ทำใน transaction เดียว: รีเซ็ตเครื่อง + ปิด ticket ที่ค้าง
    const [updatedDevice, closedTickets] = await prisma.$transaction([
      prisma.device.update({
        where: { id: deviceId },
        data: { status: 'normal' },
      }),
      prisma.ticket.updateMany({
        where: {
          deviceId,
          status: { in: ['open', 'in_progress'] },
        },
        data: { status: 'resolved' },
      }),
    ]);

    console.log(`[Admin] reset-device id=${deviceId} → normal, closed ${closedTickets.count} ticket(s)`);
    res.json({
      success: true,
      device: updatedDevice,
      closedTickets: closedTickets.count,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/admin/student-stats
router.get('/student-stats', async (_req: AuthRequest, res: Response) => {
  try {
    const students = await prisma.student.findMany({
      include: {
        _count: {
          select: { tickets: true }
        },
        tickets: {
          select: { createdAt: true }
        }
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = students.map(s => {
      const ticketsToday = s.tickets.filter(t => new Date(t.createdAt) >= today).length;
      return {
        id: s.id,
        name: s.name,
        studentId: s.studentId,
        totalTickets: s._count.tickets,
        ticketsToday,
      };
    });

    stats.sort((a, b) => b.totalTickets - a.totalTickets);

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ' });
  }
});

// PATCH /api/admin/rooms/:roomId/layout
// บันทึกผังห้องทั้งหมด (โต๊ะ + การผูกเครื่อง) ใน transaction เเดียว + เขียนประวัติ
//
// body:
// {
//   desks: [{ id?, label, x, y }],           // สถานะโต๊ะทั้งห้อง (id มี = แก้, ไม่มี = สร้างใหม่)
//   deleteIds?: [number],                     // โต๊ะที่ต้องลบ
//   assignments?: [{ deviceId, deskIndex }]   // ผูกเครื่องทุกตัวเต็มรูปแบบ (deskIndex อ้างตำแหน่งใน desks, null = ยังไม่มีโต๊ะ)
// }
router.patch('/rooms/:roomId/layout', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const roomId = Number(req.params.roomId);
  if (isNaN(roomId)) {
    res.status(400).json({ error: 'roomId ไม่ถูกต้อง' });
    return;
  }

  const body = req.body as LayoutBody;
  const desks = body.desks;
  const deleteIds = body.deleteIds ?? [];
  const assignments = body.assignments;

  if (!Array.isArray(desks)) {
    res.status(400).json({ error: 'ข้อมูล desks ไม่ถูกต้อง' });
    return;
  }

  // ── Validate desks ──
  const seenLabels = new Set<string>();
  for (const d of desks) {
    const label = typeof d.label === 'string' ? d.label.trim() : '';
    if (!label || label.length > 60) {
      res.status(400).json({ error: 'ชื่อโต๊ะต้องมีความยาว 1-60 ตัวอักษร' });
      return;
    }
    if (seenLabels.has(label)) {
      res.status(400).json({ error: `ชื่อโต๊ะซ้ำกัน: ${label}` });
      return;
    }
    seenLabels.add(label);
    d.label = label;

    const xValid = d.x === null || (typeof d.x === 'number' && Number.isFinite(d.x) && d.x >= 0 && d.x <= 100);
    const yValid = d.y === null || (typeof d.y === 'number' && Number.isFinite(d.y) && d.y >= 0 && d.y <= 100);
    if (!xValid || !yValid || (d.x === null) !== (d.y === null)) {
      res.status(400).json({ error: `พิกัดไม่ถูกต้อง (ต้องเป็น null คู่กัน หรือตัวเลข 0-100): ${label}` });
      return;
    }
    if (d.id !== undefined && (!Number.isInteger(d.id) || d.id <= 0)) {
      res.status(400).json({ error: 'id โต๊ะไม่ถูกต้อง' });
      return;
    }
  }

  const payloadIds = desks.map((d) => d.id).filter((id): id is number => id !== undefined);
  if (new Set(payloadIds).size !== payloadIds.length) {
    res.status(400).json({ error: 'มี id โต๊ะซ้ำกันใน payload' });
    return;
  }
  if (deleteIds.some((id) => payloadIds.includes(Number(id)))) {
    res.status(400).json({ error: 'โต๊ะที่ลบห้ามอยู่ในลิสต์ desks' });
    return;
  }

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      res.status(404).json({ error: 'ไม่พบห้องนี้' });
      return;
    }

    const roomDesks = await prisma.desk.findMany({ where: { roomId }, select: { id: true } });
    const roomDeskIds = new Set(roomDesks.map((d) => d.id));
    for (const id of payloadIds) {
      if (!roomDeskIds.has(id)) {
        res.status(400).json({ error: `โต๊ะ id=${id} ไม่ได้อยู่ในห้องนี้` });
        return;
      }
    }
    for (const id of deleteIds) {
      if (!roomDeskIds.has(Number(id))) {
        res.status(400).json({ error: `โต๊ะที่ลบที่ id=${id} ไม่ได้อยู่ในห้องนี้` });
        return;
      }
    }

    const roomDevices = await prisma.device.findMany({
      where: { roomId },
      select: { id: true },
    });
    const roomDeviceIds = new Set(roomDevices.map((d) => d.id));

    if (assignments) {
      if (!Array.isArray(assignments)) {
        res.status(400).json({ error: 'ข้อมูล assignments ไม่ถูกต้อง' });
        return;
      }
      const assignedIds = new Set<number>();
      for (const a of assignments) {
        if (!roomDeviceIds.has(Number(a.deviceId))) {
          res.status(400).json({ error: `เครื่อง id=${a.deviceId} ไม่ได้อยู่ในห้องนี้` });
          return;
        }
        if (assignedIds.has(Number(a.deviceId))) {
          res.status(400).json({ error: `เครื่อง id=${a.deviceId} ถูกผูกซ้ำ` });
          return;
        }
        assignedIds.add(Number(a.deviceId));
        if (a.deskIndex !== null && (!Number.isInteger(a.deskIndex) || a.deskIndex < 0 || a.deskIndex >= desks.length)) {
          res.status(400).json({ error: 'deskIndex ชี้ไม่ถึงโต๊ะที่ส่งมา' });
          return;
        }
      }
    }

    const before = await buildLayoutSnapshot(prisma, roomId);
    const adminName = req.user?.username ?? 'admin';

    const summary = await prisma.$transaction(async (tx) => {
      if (deleteIds.length > 0) {
        await tx.desk.deleteMany({
          where: { id: { in: deleteIds.map(Number) }, roomId },
        });
      }

      // สร้าง/แก้โต๊ะตาม payload — เก็บ id จริงเรียงตามตำแหน่ง payload
      const resultIds: number[] = [];
      for (const d of desks) {
        if (d.id !== undefined) {
          await tx.desk.update({
            where: { id: d.id },
            data: { label: d.label, x: d.x, y: d.y },
          });
          resultIds.push(d.id);
        } else {
          const created = await tx.desk.create({
            data: { roomId, label: d.label, x: d.x, y: d.y },
          });
          resultIds.push(created.id);
        }
      }

      if (assignments) {
        for (const a of assignments) {
          const deviceId = Number(a.deviceId);
          const deskId = a.deskIndex === null ? null : resultIds[a.deskIndex];
          await tx.device.update({
            where: { id: deviceId },
            data: { deskId },
          });
        }
        // เครื่องที่ไม่ได้ส่งมา = ยังไม่มีโต๊ะ
        const listed = new Set(assignments.map((a) => Number(a.deviceId)));
        const omitted = roomDevices.map((d) => d.id).filter((id) => !listed.has(id));
        if (omitted.length > 0) {
          await tx.device.updateMany({
            where: { id: { in: omitted } },
            data: { deskId: null },
          });
        }
      }

      const after = await buildLayoutSnapshot(tx, roomId);
      return recordLayoutHistory(tx, {
        roomId,
        action: 'save_layout',
        adminName,
        before,
        after,
      });
    });

    const after = await buildLayoutSnapshot(prisma, roomId);
    res.json({
      success: true,
      deskCount: after.desks.length,
      poolCount: after.poolDevices.length,
      summary,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกผังห้อง' });
  }
});

// POST /api/admin/rooms/:roomId/apply-layout
// คัดลอกผังจากห้องอื่นมาทับห้องนี้ (แบบ ad-hoc ไม่มีตารางเทมเพลต)
//
// body: { sourceRoomId: number, confirm?: boolean }
// - confirm !== true → คืน preview อย่างเดียว ไม่เขียนอะไร (ให้หน้า UI โชว์ก่อนยืนยัน)
// - confirm === true → แทนผังเดิมทั้งห้องใน transaction + เขียนประวัติ
//
// การจับคู่เครื่อง: ชื่อตรงกับเครื่องบนโต๊ะต้นทางก่อน → ที่เหลือจับตามลำดับชื่อ
// โต๊ะต้นทางที่ไม่มีเครื่องปลายทางเข้าจะไม่ถูกคัดลอก (ไม่สร้างโต๊ะว่าง)
router.post('/rooms/:roomId/apply-layout', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const roomId = Number(req.params.roomId);
  if (isNaN(roomId)) {
    res.status(400).json({ error: 'roomId ไม่ถูกต้อง' });
    return;
  }

  const { sourceRoomId, confirm } = req.body as { sourceRoomId?: number; confirm?: boolean };
  const sourceId = Number(sourceRoomId);
  if (isNaN(sourceId) || sourceId === roomId) {
    res.status(400).json({ error: 'ห้องต้นทางไม่ถูกต้อง' });
    return;
  }

  try {
    const [targetRoom, sourceRoom] = await Promise.all([
      prisma.room.findUnique({ where: { id: roomId } }),
      prisma.room.findUnique({
        where: { id: sourceId },
        include: {
          desks: {
            orderBy: { label: 'asc' },
            include: { devices: { orderBy: { name: 'asc' }, select: { id: true, name: true } } },
          },
        },
      }),
    ]);

    if (!targetRoom) {
      res.status(404).json({ error: 'ไม่พบห้องปลายทาง' });
      return;
    }
    if (!sourceRoom) {
      res.status(404).json({ error: 'ไม่พบห้องต้นทาง' });
      return;
    }

    const sourceDesksWithDevices = sourceRoom.desks.filter((d) => d.devices.length > 0);
    if (sourceDesksWithDevices.length === 0) {
      res.status(400).json({ error: `ห้อง ${sourceRoom.name} ยังไม่มีผัง (ไม่มีโต๊ะที่มีเครื่อง)` });
      return;
    }

    const targetDevices = await prisma.device.findMany({
      where: { roomId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });

    // ── จับคู่: ชื่อตรงกับเครื่องบนโต๊ะต้นทาง ──
    const targetByName = new Map(targetDevices.map((d) => [d.name, d]));
    const usedTargetIds = new Set<number>();
    /** sourceDesk index → device ids ที่จะผูก */
    const mapping = new Map<number, number[]>();

    sourceDesksWithDevices.forEach((desk, deskIdx) => {
      const assigned: number[] = [];
      for (const srcDev of desk.devices) {
        const hit = targetByName.get(srcDev.name);
        if (hit && !usedTargetIds.has(hit.id)) {
          usedTargetIds.add(hit.id);
          assigned.push(hit.id);
        }
      }
      if (assigned.length > 0) mapping.set(deskIdx, assigned);
    });

    const matchedByName = [...mapping.values()].reduce((sum, ids) => sum + ids.length, 0);

    // ── ที่เหลือ: จับตามลำดับชื่อ → โต๊ะต้นทางที่ยังว่าง ──
    const leftoverTarget = targetDevices.filter((d) => !usedTargetIds.has(d.id));
    const leftoverDeskIdx = sourceDesksWithDevices
      .map((_, i) => i)
      .filter((i) => !mapping.has(i));

    const assignedByOrder: number[] = [];
    const toPool: number[] = [];
    leftoverTarget.forEach((dev, i) => {
      if (i < leftoverDeskIdx.length) {
        const deskIdx = leftoverDeskIdx[i];
        mapping.set(deskIdx, [...(mapping.get(deskIdx) ?? []), dev.id]);
        assignedByOrder.push(dev.id);
      } else {
        toPool.push(dev.id);
      }
    });

    const desksToCreate = [...mapping.keys()].sort((a, b) => a - b);
    const preview = {
      sourceRoomId: sourceId,
      sourceRoomName: sourceRoom.name,
      targetRoomName: targetRoom.name,
      existingDesks: await prisma.desk.count({ where: { roomId } }),
      desksToCreate: desksToCreate.length,
      sourceDeskCount: sourceDesksWithDevices.length,
      matchedByName,
      assignedByOrder: assignedByOrder.length,
      toPool: toPool.length,
      totalDevices: targetDevices.length,
    };

    if (confirm !== true) {
      res.json({ preview });
      return;
    }

    const adminName = req.user?.username ?? 'admin';
    const summary = await prisma.$transaction(async (tx) => {
      const before = await buildLayoutSnapshot(tx, roomId);

      // แทนผังเดิม: ลบโต๊ะทั้งหมด (เครื่องจะถูกปล่อยเป็น pool ชั่วคราวด้วย ON DELETE SET NULL)
      await tx.desk.deleteMany({ where: { roomId } });

      // สร้างโต๊ะใหม่ตามลำดับต้นทาง + ผูกเครื่อง
      const createdIds = new Map<number, number>();
      for (const deskIdx of desksToCreate) {
        const src = sourceDesksWithDevices[deskIdx];
        const created = await tx.desk.create({
          data: { roomId, label: src.label, x: src.x, y: src.y },
        });
        createdIds.set(deskIdx, created.id);
      }
      for (const [deskIdx, deviceIds] of mapping) {
        const deskId = createdIds.get(deskIdx);
        if (deskId === undefined) continue;
        await tx.device.updateMany({
          where: { id: { in: deviceIds } },
          data: { deskId },
        });
      }
      // เครื่องที่ไม่ถูกผูก (toPool / ค้างอยู่เดิม) → pool
      const allMapped = [...mapping.values()].flat();
      await tx.device.updateMany({
        where: { roomId, id: { notIn: allMapped } },
        data: { deskId: null },
      });

      const after = await buildLayoutSnapshot(tx, roomId);
      return recordLayoutHistory(tx, {
        roomId,
        action: 'apply_layout',
        adminName,
        before,
        after,
        prefix: `คัดลอกผังจากห้อง ${sourceRoom.name} (${preview.desksToCreate} โต๊ะ, จับคู่ชื่อ ${preview.matchedByName}, ตามลำดับ ${preview.assignedByOrder}, ค้าง ${preview.toPool})`,
      });
    });

    res.json({ success: true, preview, summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการคัดลอกผังห้อง' });
  }
});

export { router as adminRouter };

