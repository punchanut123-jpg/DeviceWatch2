import { Router, raw } from 'express';
import { validateSignature, WebhookRequestBody } from '@line/bot-sdk';
import { PrismaClient } from '@prisma/client';
import { sendReply } from '../services/line';

const router = Router();
const prisma = new PrismaClient();

// ── Security Fix #1: Validate LINE Signature ──────────────
// ต้องใช้ raw body (Buffer) ก่อน parse เป็น JSON
// webhookRouter ถูก mount ก่อน express.json() ใน index.ts
router.use(raw({ type: 'application/json' }));

router.post('/', async (req, res) => {
  // 1) ตรวจสอบ signature header
  const signature = req.headers['x-line-signature'] as string | undefined;
  if (!signature) {
    console.warn('[Webhook] Missing x-line-signature header');
    res.status(401).json({ error: 'Missing signature' });
    return;
  }

  // 2) ดึง raw body string สำหรับตรวจสอบ
  const rawBody = (req.body as Buffer).toString('utf8');
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelSecret) {
    console.error('[Webhook] LINE_CHANNEL_SECRET not configured');
    res.status(500).json({ error: 'Server misconfigured' });
    return;
  }

  // 3) ตรวจสอบ HMAC-SHA256 signature
  if (!validateSignature(rawBody, channelSecret, signature)) {
    console.warn('[Webhook] Invalid signature — possible fake request');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  // 4) Parse body after verification
  let body: WebhookRequestBody;
  try {
    body = JSON.parse(rawBody) as WebhookRequestBody;
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  // 5) Process events
  res.status(200).json({ status: 'ok' });

  // Handle events asynchronously (after response sent)
  for (const event of body.events) {
    try {
      // ── LOG userId ทุก event ──────────────────────────────
      const userId = ('source' in event && event.source?.userId) ? event.source.userId : '(ไม่มี userId)';
      console.log(`[Webhook] event.type="${event.type}" | userId=${userId}`);

      if (event.type === 'postback') {
        const params = new URLSearchParams(event.postback.data);
        const action = params.get('action');
        const ticketId = Number(params.get('ticketId'));

        if (!action || !ticketId) continue;

        const ticket = await prisma.ticket.findUnique({
          where: { id: ticketId },
          include: { device: true },
        });

        if (!ticket) {
          await sendReply(event.replyToken, `❌ ไม่พบ Ticket #${ticketId}`);
          continue;
        }

        if (action === 'accept') {
          if (ticket.status !== 'open') {
            await sendReply(
              event.replyToken,
              `ℹ️ Ticket #${ticketId} ไม่ได้อยู่ในสถานะรอรับงาน (สถานะปัจจุบัน: ${ticket.status})`
            );
            continue;
          }
          await prisma.ticket.update({
            where: { id: ticketId },
            data: { status: 'in_progress' },
          });
          await prisma.device.update({
            where: { id: ticket.deviceId },
            data: { status: 'under_repair' },
          });
          await sendReply(
            event.replyToken,
            `✅ รับงานซ่อม Ticket #${ticketId} แล้ว\n` +
              `📍 ห้อง: ${ticket.device.roomId}\n` +
              `💻 เครื่อง: ${ticket.device.name}`
          );
        } else if (action === 'resolve') {
          if (ticket.status === 'resolved') {
            await sendReply(
              event.replyToken,
              `ℹ️ Ticket #${ticketId} ซ่อมเสร็จแล้ว`
            );
            continue;
          }
          await prisma.ticket.update({
            where: { id: ticketId },
            data: { status: 'resolved' },
          });
          await prisma.device.update({
            where: { id: ticket.deviceId },
            data: { status: 'normal' },
          });
          await sendReply(
            event.replyToken,
            `🎉 ซ่อมเสร็จ! Ticket #${ticketId}\n` +
              `💻 เครื่อง: ${ticket.device.name}\n` +
              `สถานะกลับเป็นปกติแล้ว`
          );
        }
      }
    } catch (err) {
      console.error('[Webhook] Event processing error:', err);
    }
  }
});

export { router as webhookRouter };
