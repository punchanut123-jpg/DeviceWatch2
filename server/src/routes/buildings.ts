import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/buildings
router.get('/', async (_req, res) => {
  try {
    const buildings = await prisma.building.findMany({
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });
    res.json(buildings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/buildings/all-rooms
router.get('/all-rooms', async (_req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      select: {
        id: true,
        name: true,
        floor: {
          select: {
            number: true,
            building: { select: { name: true } },
          },
        },
        _count: { select: { devices: true, desks: { where: { devices: { some: {} } } } } },
      },
      orderBy: [{ floor: { number: 'asc' } }, { name: 'asc' }],
    });
    res.json(rooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/buildings/:id/floors
router.get('/:id/floors', async (req, res) => {
  try {
    const floors = await prisma.floor.findMany({
      where: { buildingId: Number(req.params.id) },
      select: {
        id: true,
        number: true,
        _count: { select: { rooms: true } },
      },
      orderBy: { number: 'asc' },
    });
    res.json(floors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/buildings/floors/:floorId/rooms
router.get('/floors/:floorId/rooms', async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { floorId: Number(req.params.floorId) },
      select: {
        id: true,
        name: true,
        _count: { select: { devices: true, desks: { where: { devices: { some: {} } } } } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(rooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/buildings/rooms/:roomId
router.get('/rooms/:roomId', async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: Number(req.params.roomId) },
      select: {
        id: true,
        name: true,
        floor: {
          select: {
            id: true,
            number: true,
            building: { select: { id: true, name: true } },
          },
        },
        devices: {
          select: {
            id: true,
            name: true,
            posX: true,
            posY: true,
            status: true,
          },
          orderBy: { name: 'asc' },
        },
        desks: {
          select: {
            id: true,
            label: true,
            x: true,
            y: true,
            devices: {
              select: { id: true, name: true, status: true },
              orderBy: { name: 'asc' },
            },
          },
          orderBy: { label: 'asc' },
        },
      },
    });
    if (!room) {
      res.status(404).json({ error: 'ไม่พบห้องนี้' });
      return;
    }
    res.json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

export { router as buildingsRouter };
