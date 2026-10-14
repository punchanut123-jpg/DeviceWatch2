import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { sendTicketNotification } from '../services/line';

const router = Router();
const prisma = new PrismaClient();

// ── Security Fix #2: Rate Limit ──────────────────────────
// ป้องกัน spam: max 5 tickets per IP per 15 minutes
const ticketRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'แจ้งซ่อมได้ไม่เกิน 5 ครั้งต่อ 15 นาที กรุณารอสักครู่แล้วลองใหม่',
    retryAfter: '15 นาที',
  },
  keyGenerator: (req) => req.ip || 'unknown',
});

// GET /api/tickets - List tickets (for admin use via query)
router.get('/', async (req, res) => {
  try {
    const { status, limit = '50' } = req.query;
    const tickets = await prisma.ticket.findMany({
      where: status ? { status: status as string } : undefined,
      include: {
        device: {
          select: {
            name: true,
            room: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    });
    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/tickets - Create new repair ticket
router.post('/', ticketRateLimit, async (req, res) => {
  console.log('\n=== [POST /api/tickets] เริ่ม process ===');
  console.log('  Body:', JSON.stringify(req.body));

  const { deviceId, description, reportedByUserId, studentId } = req.body as {
    deviceId: number;
    description: string;
    reportedByUserId?: number;
    studentId?: number;
  };

  // Validate input
  if (!deviceId || !description?.trim()) {
    res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    return;
  }
  if (description.trim().length < 5) {
    res.status(400).json({ error: 'กรุณาอธิบายอาการให้ละเอียดขึ้น (อย่างน้อย 5 ตัวอักษร)' });
    return;
  }
  if (description.trim().length > 500) {
    res.status(400).json({ error: 'คำอธิบายยาวเกินไป (ไม่เกิน 500 ตัวอักษร)' });
    return;
  }

  try {
    // Check device exists
    const device = await prisma.device.findUnique({
      where: { id: Number(deviceId) },
      include: { room: true },
    });
    if (!device) {
      res.status(404).json({ error: 'ไม่พบอุปกรณ์นี้' });
      return;
    }

    console.log(`  ✅ พบ device: id=${device.id}, name=${device.name}, roomId=${device.roomId}`);
    console.log(`  📍 Room: name=${device.room.name}, lineUserId=${device.room.lineUserId ?? 'NULL'}`);

    // ── Anti-spam: ป้องกันแจ้งซ่อมซ้ำที่ระดับชิ้น (device) ──────────
    const existingDeviceTicket = await prisma.ticket.findFirst({
      where: {
        deviceId: Number(deviceId),
        status: { in: ['open', 'in_progress'] },
      },
    });
    if (existingDeviceTicket) {
      console.warn(`  ⚠️ Duplicate ticket (device): ticketId=${existingDeviceTicket.id}, status=${existingDeviceTicket.status}`);
      res.status(409).json({
        error: 'เครื่องนี้มีการแจ้งซ่อมที่ยังไม่เสร็จอยู่แล้ว',
        ticketId: existingDeviceTicket.id,
        status: existingDeviceTicket.status,
      });
      return;
    }

    // ── Anti-spam: ป้องกันแจ้งซ่อมซ้ำที่ระดับโต๊ะ (desk) ──────────
    const deviceInfo = await prisma.device.findUnique({
      where: { id: Number(deviceId) },
      select: { deskId: true },
    });
    if (deviceInfo?.deskId) {
      const otherDevicesOnDesk = await prisma.device.findMany({
        where: { deskId: deviceInfo.deskId },
        select: { id: true },
      });
      const otherDeviceIds = otherDevicesOnDesk.map(d => d.id).filter(id => id !== Number(deviceId));
      
      if (otherDeviceIds.length > 0) {
        const existingDeskTicket = await prisma.ticket.findFirst({
          where: {
            deviceId: { in: otherDeviceIds },
            status: { in: ['open', 'in_progress'] },
          },
        });
        if (existingDeskTicket) {
          console.warn(`  ⚠️ Duplicate ticket (desk): ticketId=${existingDeskTicket.id}, status=${existingDeskTicket.status}`);
          res.status(409).json({
            error: 'โต๊ะนี้มีการแจ้งซ่อมค้างอยู่แล้ว (อาจเป็นชิ้นส่วนอื่นบนโต๊ะเดียวกัน)',
            ticketId: existingDeskTicket.id,
            status: existingDeskTicket.status,
          });
          return;
        }
      }
    }

    // Create ticket
    const ticket = await prisma.ticket.create({
      data: {
        deviceId: Number(deviceId),
        description: description.trim(),
        status: 'open',
        reportedByUserId: reportedByUserId ? Number(reportedByUserId) : undefined,
        studentId: studentId ? Number(studentId) : undefined,
      },
    });

    // Update device status to broken
    await prisma.device.update({
      where: { id: Number(deviceId) },
      data: { status: 'broken' },
    });

    // Send LINE notification if room has a technician
    console.log(`  🔑 LINE Token: ${process.env.LINE_CHANNEL_ACCESS_TOKEN ? 'มีค่า (' + process.env.LINE_CHANNEL_ACCESS_TOKEN.slice(0, 8) + '...)' : '❌ undefined'}`);
    console.log(`  👤 lineUserId: ${device.room.lineUserId ?? '❌ NULL'}`);

    if (device.room.lineUserId) {
      console.log('  📨 กำลังเรียก sendTicketNotification ...');
      sendTicketNotification(device.room.lineUserId, {
        ticketId: ticket.id,
        roomName: device.room.name,
        deviceName: device.name,
        description: description.trim(),
      }).then(() => {
        console.log(`  ✅ LINE ส่งสำเร็จ → ticketId=${ticket.id}`);
      }).catch((err) => {
        console.error('  ❌ LINE send error — full dump:');
        console.error('    status  :', err.status ?? err.statusCode);
        console.error('    message :', err.message);
        // LINE SDK v8+ stores the parsed response body here
        console.error('    body    :', JSON.stringify(err.body ?? err.originalError?.body ?? err.response?.data, null, 2));
        // Fallback: print raw error object
        console.error('    raw err :', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      });
    } else {
      console.warn(`  ⚠️ Room ${device.room.name} ไม่มี lineUserId — ไม่ส่ง LINE`);
    }
    console.log('=== [POST /api/tickets] จบ process ===\n');

    res.status(201).json({ success: true, ticketId: ticket.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
  }
});

export { router as ticketsRouter };
