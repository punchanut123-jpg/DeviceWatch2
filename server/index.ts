import 'dotenv/config';
import express, { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── Rate Limiter สำหรับ Login ──────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 5, // อนุญาตให้ยิง request ได้ 5 ครั้งต่อ IP
  message: { error: 'เข้าสู่ระบบผิดพลาดเกินกำหนด กรุณาลองใหม่ในอีก 15 นาที' }
});

// ─── Middleware สำหรับตรวจสอบ JWT ───────────────────────────────────────────
const verifyToken: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const jwtSecret = process.env.JWT_SECRET || 'devicewatch_secret_key';
    jwt.verify(token, jwtSecret);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
};

// ─── LINE Webhook ──────────────────────────────────────────────────────────────
app.post('/webhook', async (req: Request, res: Response) => {
  const events = req.body.events;

  // ตอบกลับ 200 OK ให้ LINE ทันทีตามเอกสาร API
  res.status(200).send('OK');

  if (!events || events.length === 0) return;

  for (const event of events) {
    // ตรวจสอบว่าเป็นการกดปุ่ม (postback)
    if (event.type === 'postback') {
      const data = event.postback.data;
      const params = new URLSearchParams(data);
      const action = params.get('action');
      const ticketId = Number(params.get('ticketId'));

      if (action && ticketId) {
        try {
          const newTicketStatus = action === 'start' ? 'in_progress' : 'resolved';
          const newDeviceStatus = action === 'start' ? 'under_repair' : 'normal';
          const statusTextTh = action === 'start' ? 'กำลังซ่อม 🔧' : 'ซ่อมเสร็จแล้ว ✅';

          // 1. อัปเดต Ticket
          const updatedTicket = await prisma.ticket.update({
            where: { id: ticketId },
            data: { status: newTicketStatus }
          });

          // 2. อัปเดต Device
          await prisma.device.update({
            where: { id: updatedTicket.deviceId },
            data: { status: newDeviceStatus }
          });

          console.log(`✅ อัปเดต Ticket #${ticketId} เป็น ${newTicketStatus}`);

          // 3. ส่งข้อความตอบกลับยืนยันใน LINE
          const replyToken = event.replyToken;
          const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

          if (lineToken && replyToken) {
            await fetch('https://api.line.me/v2/bot/message/reply', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${lineToken}`
              },
              body: JSON.stringify({
                replyToken: replyToken,
                messages: [
                  {
                    type: 'text',
                    text: `✅ อัปเดตสถานะ Ticket #${ticketId} เรียบร้อยแล้ว\n(สถานะใหม่: ${statusTextTh})`
                  }
                ]
              })
            });
          }

        } catch (error) {
          console.error('❌ Error updating ticket from Webhook:', error);
        }
      }
    }
  }
});

app.get('/api/buildings', async (req: Request, res: Response) => {
  const buildings = await prisma.building.findMany({
    include: {
      floors: {
        include: {
          rooms: {
            include: {
              devices: true, // ดึง devices มาเพื่อคำนวณสถานะ
            },
          },
        },
      },
    },
  });

  // map ข้อมูลเพื่อให้ได้ brokenCount และ totalCount
  const buildingsWithStats = buildings.map((b) => {
    let brokenCount = 0;
    let totalCount = 0; // เพิ่มตัวแปรนับเครื่องทั้งหมด

    b.floors.forEach((f) => {
      f.rooms.forEach((r) => {
        brokenCount += r.devices.filter((d) => d.status === 'broken').length;
        totalCount += r.devices.length; // นับอุปกรณ์ทั้งหมดในห้อง
      });
    });
    return { ...b, brokenCount, totalCount };
  });

  res.json(buildingsWithStats);
});

app.get('/api/buildings/:id', async (req: Request, res: Response) => {
  const building = await prisma.building.findUnique({
    where: { id: Number(req.params.id) },
    include: { floors: true },
  });
  res.json(building);
});

app.get('/api/buildings/:id/floors', async (req: Request, res: Response) => {
  const buildingId = Number(req.params.id);
  
  const floors = await prisma.floor.findMany({
    where: { buildingId },
    orderBy: { floorNumber: 'asc' },
    include: {
      rooms: {
        include: {
          devices: true
        }
      }
    }
  });

  const floorsWithStats = floors.map(floor => {
    let brokenCount = 0;
    floor.rooms.forEach(room => {
      brokenCount += room.devices.filter(d => d.status === 'broken').length;
    });
    return { ...floor, brokenCount };
  });

  res.json(floorsWithStats);
});

app.get('/api/floors/:id/rooms', async (req: Request, res: Response) => {
  const floorId = Number(req.params.id);
  
  const rooms = await prisma.room.findMany({
    where: { floorId },
    include: {
      devices: true // ดึง device มาเพื่อเช็คสถานะ
    }
  });

  const roomsWithStats = rooms.map(room => {
    // นับเครื่องที่เสียในห้องนี้
    const brokenCount = room.devices.filter(d => d.status === 'broken').length;
    return { ...room, brokenCount };
  });

  res.json(roomsWithStats);
});

// ─── Breadcrumb Helpers ────────────────────────────────────────────────────────
app.get('/api/floors/:id', async (req: Request, res: Response) => {
  try {
    const floor = await prisma.floor.findUnique({ where: { id: Number(req.params.id) } });
    res.json(floor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch floor' });
  }
});

app.get('/api/rooms/:id', async (req: Request, res: Response) => {
  try {
    const room = await prisma.room.findUnique({ where: { id: Number(req.params.id) } });
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// ─── Devices ──────────────────────────────────────────────────────────────────
app.get('/api/rooms/:id/devices', async (req: Request, res: Response) => {
  const devices = await prisma.device.findMany({
    where: { roomId: Number(req.params.id) },
    include: { tickets: { orderBy: { reportedAt: 'desc' }, take: 1 } },
  });
  res.json(devices);
});

app.get('/api/devices/:id', async (req: Request, res: Response) => {
  const device = await prisma.device.findUnique({
    where: { id: Number(req.params.id) },
    include: { tickets: { orderBy: { reportedAt: 'desc' } }, room: true },
  });
  res.json(device);
});

app.patch('/api/devices/:id', async (req: Request, res: Response) => {
  const { status, deviceName, posX, posY } = req.body;
  const device = await prisma.device.update({
    where: { id: Number(req.params.id) },
    data: { status, deviceName, posX, posY },
  });
  res.json(device);
});

// ─── Tickets ──────────────────────────────────────────────────────────────────
app.get('/api/tickets', verifyToken, async (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

  try {
    const tickets = await prisma.ticket.findMany({
      take: limit,
      orderBy: { reportedAt: 'desc' },
      include: {
        device: {
          include: { room: { include: { floor: { include: { building: true } } } } }
        }
      },
    });
    res.json(tickets);
  } catch (error) {
    console.error('Failed to fetch tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

app.post('/api/tickets', async (req: Request, res: Response) => {
  const { deviceId, symptom } = req.body;
  try {
    const ticket = await prisma.ticket.create({
      data: {
        deviceId: Number(deviceId),
        symptom,
        status: 'open',
      },
    });

    await prisma.device.update({
      where: { id: Number(deviceId) },
      data: { status: 'broken' },
    });

    // ดึงข้อมูลเครื่องและห้องเพื่อไปแสดงใน LINE
    const deviceData = await prisma.device.findUnique({
      where: { id: Number(deviceId) },
      include: { room: true }
    });

    // ส่ง LINE Notification ด้วย Flex Message
    const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const lineUserId = deviceData?.room?.lineUserId;

    if (lineToken && lineUserId) {
      const flexMessage = {
        to: lineUserId,
        messages: [
          {
            type: 'flex',
            altText: `แจ้งซ่อมใหม่: ห้อง ${deviceData?.room?.roomName}`,
            contents: {
              type: 'bubble',
              header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  { type: 'text', text: '🔴 แจ้งซ่อมใหม่', weight: 'bold', size: 'xl', color: '#ef4444' }
                ]
              },
              body: {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: `🏢 ห้อง: ${deviceData?.room?.roomName}` },
                  { type: 'text', text: `💻 เครื่อง: ${deviceData?.deviceName}` },
                  { type: 'text', text: `⚠️ อาการ: ${symptom}`, wrap: true },
                  { type: 'text', text: `🕒 เวลา: ${new Date().toLocaleString('th-TH')}`, size: 'xs', color: '#888888' }
                ]
              },
              footer: {
                type: 'box',
                layout: 'horizontal',
                spacing: 'sm',
                contents: [
                  {
                    type: 'button',
                    style: 'primary',
                    color: '#eab308',
                    action: {
                      type: 'postback',
                      label: '🔧 รับงานซ่อม',
                      data: `action=start&ticketId=${ticket.id}`
                    }
                  },
                  {
                    type: 'button',
                    style: 'primary',
                    color: '#22c55e',
                    action: {
                      type: 'postback',
                      label: '✅ ซ่อมเสร็จแล้ว',
                      data: `action=done&ticketId=${ticket.id}`
                    }
                  }
                ]
              }
            }
          }
        ]
      };

      await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lineToken}`,
        },
        body: JSON.stringify(flexMessage),
      });
    }

    res.status(201).json(ticket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

app.patch('/api/tickets/:id', verifyToken, async (req: Request, res: Response) => {
  const { status, resolutionNote } = req.body;
  const ticket = await prisma.ticket.update({
    where: { id: Number(req.params.id) },
    data: {
      status,
      resolutionNote,
      resolvedAt: status === 'resolved' ? new Date() : null,
    },
  });
  if (status === 'resolved') {
    await prisma.device.update({
      where: { id: ticket.deviceId },
      data: { status: 'normal' },
    });
  } else if (status === 'in_progress') {
    await prisma.device.update({
      where: { id: ticket.deviceId },
      data: { status: 'under_repair' },
    });
  }
  res.json(ticket);
});

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
app.get('/api/stats', verifyToken, async (_req: Request, res: Response) => {
  try {
    const [total, normal, broken, under_repair] = await Promise.all([
      prisma.device.count(),
      prisma.device.count({ where: { status: 'normal' } }),
      prisma.device.count({ where: { status: 'broken' } }),
      prisma.device.count({ where: { status: 'under_repair' } }),
    ]);
    res.json({ total, normal, broken, under_repair });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── Admin Login ─────────────────────────────────────────────────────────────
app.post('/api/admin/login', loginLimiter, (req: Request, res: Response) => {
  const { username, password } = req.body;

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET || 'devicewatch_secret_key';

  if (username === adminUsername && password === adminPassword) {
    // กำหนดให้หมดอายุใน 8 ชั่วโมง
    const token = jwt.sign({ role: 'admin' }, jwtSecret, { expiresIn: '8h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Username หรือ Password ไม่ถูกต้อง' });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 DeviceWatch Server running on http://localhost:${PORT}`);
});
