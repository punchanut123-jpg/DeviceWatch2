import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

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
// Bulk update device positions for a specific room
router.patch('/rooms/:roomId/layout', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const roomId = Number(req.params.roomId);
  if (isNaN(roomId)) {
    res.status(400).json({ error: 'roomId ไม่ถูกต้อง' });
    return;
  }

  const { devices } = req.body as { devices: Array<{ id: number; posX: number | null; posY: number | null }> };
  if (!Array.isArray(devices)) {
    res.status(400).json({ error: 'ข้อมูล devices ไม่ถูกต้อง' });
    return;
  }

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      res.status(404).json({ error: 'ไม่พบห้องนี้' });
      return;
    }

    const updateOps = devices.map((d) =>
      prisma.device.updateMany({
        where: { id: Number(d.id), roomId },
        data: {
          posX: d.posX !== undefined && d.posX !== null ? Number(d.posX) : null,
          posY: d.posY !== undefined && d.posY !== null ? Number(d.posY) : null,
        },
      })
    );

    await prisma.$transaction(updateOps);

    res.json({ success: true, updatedCount: devices.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกตำแหน่งผังห้อง' });
  }
});

export { router as adminRouter };

