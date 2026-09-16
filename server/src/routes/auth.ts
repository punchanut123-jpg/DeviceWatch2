import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

const router = Router();

// Rate limit: 5 failed login attempts per 15 min per IP
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'พยายาม Login ผิดหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่',
  },
  skipSuccessfulRequests: true, // นับเฉพาะครั้งที่ล้มเหลว
});

// POST /api/auth/login
router.post('/login', loginRateLimit, (req, res) => {
  const { username, password } = req.body as {
    username: string;
    password: string;
  };

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const teacherUsername = process.env.TEACHER_USERNAME;
  const teacherPassword = process.env.TEACHER_PASSWORD;

  let role = '';

  if (username === adminUsername && password === adminPassword) {
    role = 'admin';
  } else if (username === teacherUsername && password === teacherPassword) {
    role = 'teacher';
  }

  if (!role) {
    res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    return;
  }

  const token = jwt.sign(
    { username, role },
    process.env.JWT_SECRET!,
    { expiresIn: '8h' }
  );

  res.json({ token, username, role });
});

export { router as authRouter };
