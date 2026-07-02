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
app.get('/api/tickets', async (_req: Request, res: Response) => {
  const tickets = await prisma.ticket.findMany({
    include: { device: { include: { room: { include: { floor: { include: { building: true } } } } } } },
    orderBy: { reportedAt: 'desc' },
  });
  res.json(tickets);
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

    // 3. ส่ง LINE Message ถ้าห้องนั้นมีช่างรับผิดชอบ (lineUserId)
    if (device && device.room && device.room.lineUserId) {
      const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

      const messageText =
`🔴 แจ้ซ่อมใหม่ — DeviceWatch
ห้อง: ${device.room.roomNumber}
เครื่อง: ${device.deviceCode}
อาการ: ${symptom}`;

      try {
        await axios.post(
          'https://api.line.me/v2/bot/message/push',
          {
            to: device.room.lineUserId,
            messages: [{ type: 'text', text: messageText }],
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${lineToken}`,
            },
          }
        );
        console.log(`✅ LINE notification sent to ${device.room.lineUserId} for room ${device.room.roomNumber}`);
      } catch (lineErr) {
        // ไม่ throw error เพื่อให้ API ยัง return success แม้ LINE ส่งไม่ผ่าน
        console.error('❌ Failed to send LINE notification:', lineErr);
      }
    }

    res.status(201).json(ticket);
  } catch (error) {
    console.error(error);
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
  const [totalDevices, brokenDevices, underRepair, openTickets] = await Promise.all([
    prisma.device.count(),
    prisma.device.count({ where: { status: 'broken' } }),
    prisma.device.count({ where: { status: 'under_repair' } }),
    prisma.ticket.count({ where: { status: { in: ['open', 'in_progress'] } } }),
  ]);
  res.json({ totalDevices, brokenDevices, underRepair, openTickets });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 DeviceWatch Server running on http://localhost:${PORT}`);
});
