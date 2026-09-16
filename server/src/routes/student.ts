import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// POST /api/student/register
router.post('/register', async (req, res) => {
  try {
    const { name, studentId, password } = req.body;
    if (!name || !studentId || !password) {
      res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
      return;
    }

    const existingStudent = await prisma.student.findUnique({
      where: { studentId }
    });

    if (existingStudent) {
      res.status(400).json({ error: 'รหัสนักศึกษานี้ลงทะเบียนแล้ว' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const student = await prisma.student.create({
      data: {
        name,
        studentId,
        passwordHash
      }
    });

    res.json({ message: 'ลงทะเบียนสำเร็จ', studentId: student.studentId });
  } catch (error) {
    console.error('Error registering student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/student/login
router.post('/login', async (req, res) => {
  try {
    const { studentId, password } = req.body;
    if (!studentId || !password) {
      res.status(400).json({ error: 'กรุณากรอกรหัสนักศึกษาและรหัสผ่าน' });
      return;
    }

    const student = await prisma.student.findUnique({
      where: { studentId }
    });

    if (!student) {
      res.status(401).json({ error: 'รหัสนักศึกษาหรือรหัสผ่านไม่ถูกต้อง' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, student.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'รหัสนักศึกษาหรือรหัสผ่านไม่ถูกต้อง' });
      return;
    }

    const token = jwt.sign(
      { id: student.id, studentId: student.studentId, role: 'student' },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      student: {
        id: student.id,
        name: student.name,
        studentId: student.studentId,
      }
    });
  } catch (error) {
    console.error('Error logging in student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/student/history
router.get('/history', requireAuth, async (req: AuthRequest, res) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      res.status(400).json({ error: 'ไม่พบรหัสนักศึกษา' });
      return;
    }

    const tickets = await prisma.ticket.findMany({
      where: { studentId },
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
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(tickets);
  } catch (error) {
    console.error('Error fetching student history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as studentRouter };
