import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── Buildings ────────────────────────────────────────────────────────────────
app.get('/api/buildings', async (_req: Request, res: Response) => {
  const buildings = await prisma.building.findMany();
  res.json(buildings);
});

app.get('/api/buildings/:id', async (req: Request, res: Response) => {
  const building = await prisma.building.findUnique({
    where: { id: Number(req.params.id) },
    include: { floors: true },
  });
  res.json(building);
});

// ─── Floors ───────────────────────────────────────────────────────────────────
app.get('/api/buildings/:id/floors', async (req: Request, res: Response) => {
  const floors = await prisma.floor.findMany({
    where: { buildingId: Number(req.params.id) },
    orderBy: { floorNumber: 'asc' },
  });
  res.json(floors);
});

// ─── Rooms ────────────────────────────────────────────────────────────────────
app.get('/api/floors/:id/rooms', async (req: Request, res: Response) => {
  const rooms = await prisma.room.findMany({
    where: { floorId: Number(req.params.id) },
  });
  res.json(rooms);
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
  const ticket = await prisma.ticket.create({
    data: { deviceId: Number(deviceId), symptom },
  });
  await prisma.device.update({
    where: { id: Number(deviceId) },
    data: { status: 'broken' },
  });
  res.status(201).json(ticket);
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
