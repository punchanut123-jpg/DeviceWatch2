import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// POST /api/identify/student
router.post('/identify/student', async (req: Request, res: Response) => {
  try {
    const { studentId, name } = req.body;
    if (!studentId || !name) {
      return res.status(400).json({ error: 'studentId and name are required' });
    }

    let user = await prisma.user.findFirst({
      where: { role: 'student', studentId }
    });

    if (!user) {
      user = await prisma.user.create({
        data: { role: 'student', studentId, name }
      });
    } else if (user.name !== name) {
      // Optional: update name if changed, though spec didn't ask for it
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name }
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Error identifying student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/students/:id/history
router.get('/students/:id/history', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tickets: {
          orderBy: { createdAt: 'desc' },
          include: {
            device: {
              include: {
                room: {
                  include: {
                    floor: {
                      include: { building: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(user.tickets);
  } catch (error) {
    console.error('Error fetching student history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/teacher/overview
router.get('/teacher/overview', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalDevices,
      brokenDevicesCount,
      underRepairDevicesCount,
      ticketsToday,
      allRooms,
      last7DaysTickets
    ] = await Promise.all([
      prisma.device.count(),
      prisma.device.count({ where: { status: 'broken' } }),
      prisma.device.count({ where: { status: 'under_repair' } }),
      prisma.ticket.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.room.findMany({
        include: {
          devices: {
            select: { status: true }
          },
          floor: {
            include: { building: true }
          }
        }
      }),
      prisma.ticket.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        select: { createdAt: true }
      })
    ]);

    // Format rooms summary
    const roomsSummary = allRooms.map(room => {
      const total = room.devices.length;
      const broken = room.devices.filter(d => d.status === 'broken').length;
      const underRepair = room.devices.filter(d => d.status === 'under_repair').length;
      return {
        roomId: room.id,
        roomName: room.name,
        buildingName: room.floor.building.name,
        floorNumber: room.floor.number,
        totalDevices: total,
        brokenCount: broken,
        underRepairCount: underRepair,
        totalIssues: broken + underRepair
      };
    });

    // We can also find the brokenDevices list to show detailed cards/lists if needed
    const brokenDevicesList = await prisma.device.findMany({
      where: {
        status: { in: ['broken', 'under_repair'] }
      },
      include: {
        room: {
          include: {
            floor: {
              include: { building: true }
            }
          }
        }
      }
    });

    // Format trend data (last 7 days in Thai locale)
    const trendMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      trendMap.set(dateStr, 0);
    }

    last7DaysTickets.forEach(t => {
      const dateStr = new Date(t.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      if (trendMap.has(dateStr)) {
        trendMap.set(dateStr, trendMap.get(dateStr)! + 1);
      }
    });

    const trend = Array.from(trendMap.entries()).map(([date, count]) => ({ date, count }));

    res.json({
      brokenDevices: brokenDevicesList,
      stats: {
        total: totalDevices,
        normal: totalDevices - brokenDevicesCount - underRepairDevicesCount,
        broken: brokenDevicesCount,
        underRepair: underRepairDevicesCount,
        ticketsToday
      },
      roomsSummary,
      trend
    });
  } catch (error) {
    console.error('Error fetching teacher overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as identityRouter };
