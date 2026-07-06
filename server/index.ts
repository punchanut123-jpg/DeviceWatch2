import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── LINE Webhook ──────────────────────────────────────────────────────────────
app.post('/webhook', (req: Request, res: Response) => {
  const events = req.body.events;
  if (events && events.length > 0) {
    events.forEach((event: any) => {
      console.log('📩 LINE Event Type:', event.type);
      console.log('👤 LINE User ID:', event.source?.userId);
    });
  }
  res.status(200).send('OK');
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

  // map ข้อมูลเพื่อให้ได้ brokenCount
  const buildingsWithStats = buildings.map((b) => {
    let brokenCount = 0;
    b.floors.forEach((f) => {
      f.rooms.forEach((r) => {
        brokenCount += r.devices.filter((d) => d.status === 'broken').length;
      });
    });
    return { ...b, brokenCount };
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
app.get('/api/tickets', async (req: Request, res: Response) => {
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
    // 1. สร้าง Ticket และอัปเดตสถานะเครื่อง
    const ticket = await prisma.ticket.create({
      data: { deviceId: Number(deviceId), symptom },
    });

    await prisma.device.update({
      where: { id: Number(deviceId) },
      data: { status: 'broken' },
    });

    // 2. ดึงข้อมูลเครื่องและห้อง เพื่อเอา LINE User ID
    const device = await prisma.device.findUnique({
      where: { id: Number(deviceId) },
      include: { room: true },
    });

    // 3. ส่ง LINE Message ถ้าห้องนั้นมีช่างรับผิดชอบ
    if (device && device.room && device.room.lineUserId) {
      const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
      const lineUserId = device.room.lineUserId;

      const messageText =
`🔴 แจ้งซ่อมใหม่ — DeviceWatch
ห้อง: ${device.room.roomNumber}
เครื่อง: ${device.deviceCode}
อาการ: ${symptom}`;

      // --- ส่วน Debugging Logs ---
      console.log('กำลังส่ง LINE ไปหา:', lineUserId);
      console.log('ใช้ Token:', lineToken ? lineToken.substring(0, 20) + '...' : 'UNDEFINED ❌');

      try {
        const response = await axios.post(
          'https://api.line.me/v2/bot/message/push',
          {
            to: lineUserId,
            messages: [{ type: 'text', text: messageText }],
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${lineToken}`,
            },
          }
        );
        console.log('✅ LINE response status:', response.status);
        console.log('✅ LINE response data:', response.data);
      } catch (err: any) {
        console.error('❌ LINE error status:', err.response?.status);
        console.error('❌ LINE error data:', JSON.stringify(err.response?.data, null, 2));
      }
    }

    res.status(201).json(ticket);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

app.patch('/api/tickets/:id', async (req: Request, res: Response) => {
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
app.get('/api/stats', async (_req: Request, res: Response) => {
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

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 DeviceWatch Server running on http://localhost:${PORT}`);
});
