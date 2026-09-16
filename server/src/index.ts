import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ──────────────────────────────────────────────────────────
// IMPORTANT: Mount webhook BEFORE express.json()
// so raw body is preserved for LINE signature validation
// ──────────────────────────────────────────────────────────
import { webhookRouter } from './routes/webhook';
app.use('/webhook', webhookRouter);

// ── Global Middleware ─────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Dynamic CORS configuration based on process.env.CORS_ORIGIN
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : [
      'http://localhost:5173',
      'http://localhost:4173',
      'http://127.0.0.1:5173',
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman, same-origin)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('CORS Policy: Origin not allowed by DeviceWatch Security'));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

// ── API Routes ────────────────────────────────────────────
import { buildingsRouter } from './routes/buildings';
import { ticketsRouter } from './routes/tickets';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { identityRouter } from './routes/identity';
import { studentRouter } from './routes/student';

app.use('/api/buildings', buildingsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/student', studentRouter);
app.use('/api', identityRouter);

// ── Health Check ──────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 Handler ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Start Server ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 DeviceWatch server → http://localhost:${PORT}`);
  console.log(`📋 Health check   → http://localhost:${PORT}/health`);
});
