import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { countDesksByStatus, rollupDeskStatus } from '../services/deskRollup';
import { STATUS_SEVERITY } from '../constants/layoutRules';

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
      ticketsToday,
      allRooms,
      last7DaysTickets,
      totalComponents,
      brokenComponents,
      underRepairComponents,
    ] = await Promise.all([
      prisma.ticket.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.room.findMany({
        include: {
          desks: {
            select: {
              id: true,
              label: true,
              devices: {
                select: { name: true, status: true, deviceType: true },
              },
            },
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
      }),
      prisma.device.count(),
      prisma.device.count({ where: { status: 'broken' } }),
      prisma.device.count({ where: { status: 'under_repair' } }),
    ]);

    // สถิติรวม = นับโต๊ะ (เฉพาะโต๊ะที่มีเครื่อง ≥ 1) ตาม rollup ชิ้นหลัก
    const globalCounts = countDesksByStatus(
      allRooms.flatMap(room => room.desks)
    );

    // Format rooms summary (นับโต๊ะรายห้อง)
    const roomsSummary = allRooms.map(room => {
      const counts = countDesksByStatus(room.desks);
      return {
        roomId: room.id,
        roomName: room.name,
        buildingName: room.floor.building.name,
        floorNumber: room.floor.number,
        totalDesks: counts.total,
        brokenDesks: counts.broken,
        underRepairDesks: counts.underRepair,
        totalIssues: counts.broken + counts.underRepair
      };
    });

    // โต๊ะที่มีปัญหา (rollup ไม่ใช่ normal) พร้อมชิ้นส่วนที่เสีย
    const brokenDesks = allRooms.flatMap(room =>
      room.desks
        .map(desk => {
          const status = rollupDeskStatus(desk.devices);
          return {
            id: desk.id,
            label: desk.label,
            status,
            roomName: room.name,
            floorNumber: room.floor.number,
            buildingName: room.floor.building.name,
            parts: desk.devices
              .filter(d => d.status !== 'normal')
              .map(d => ({ name: d.name, status: d.status }))
          };
        })
        .filter(d => d.status !== null && d.status !== 'normal')
    );
    brokenDesks.sort((a, b) => {
      const bySeverity =
        STATUS_SEVERITY.indexOf(b.status!) - STATUS_SEVERITY.indexOf(a.status!);
      if (bySeverity !== 0) return bySeverity;
      return a.roomName.localeCompare(b.roomName, 'th', { numeric: true });
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
      brokenDesks,
      stats: {
        total: globalCounts.total,
        normal: globalCounts.normal,
        broken: globalCounts.broken,
        underRepair: globalCounts.underRepair,
        ticketsToday,
        // Component stats (นับทั้งโต๊ะ + pool)
        components: {
          total: totalComponents,
          broken: brokenComponents,
          underRepair: underRepairComponents
        }
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
