import { messagingApi } from '@line/bot-sdk';

let _client: messagingApi.MessagingApiClient | null = null;

function getClient() {
  if (!_client) {
    _client = new messagingApi.MessagingApiClient({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
    });
  }
  return _client;
}

interface TicketInfo {
  ticketId: number;
  roomName: string;
  deviceName: string;
  description: string;
}

// ── Flex Message Builder ───────────────────────────────────
function buildTicketFlexMessage(info: TicketInfo): messagingApi.FlexMessage {
  const { ticketId, roomName, deviceName, description } = info;
  const timeStr = new Date().toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    type: 'flex',
    altText: `🔧 แจ้งซ่อม ห้อง ${roomName} เครื่อง ${deviceName}`,
    contents: {
      type: 'bubble',
      size: 'giga',
      header: {
        type: 'box',
        layout: 'horizontal',
        backgroundColor: '#1565C0',
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: '🔧',
            size: 'xxl',
            flex: 0,
          },
          {
            type: 'box',
            layout: 'vertical',
            flex: 1,
            paddingStart: '12px',
            contents: [
              {
                type: 'text',
                text: 'แจ้งซ่อมอุปกรณ์',
                color: '#FFFFFF',
                weight: 'bold',
                size: 'lg',
              },
              {
                type: 'text',
                text: `Ticket #${ticketId}`,
                color: '#BBDEFB',
                size: 'sm',
              },
            ],
          },
        ],
      } as messagingApi.FlexBox,
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        spacing: 'sm',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '📍', flex: 0, size: 'md' },
              { type: 'text', text: 'ห้อง', color: '#666666', flex: 1, margin: 'sm', size: 'md' },
              { type: 'text', text: roomName, color: '#1a1a1a', weight: 'bold', flex: 2, size: 'md' },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '💻', flex: 0, size: 'md' },
              { type: 'text', text: 'เครื่อง', color: '#666666', flex: 1, margin: 'sm', size: 'md' },
              { type: 'text', text: deviceName, color: '#1a1a1a', weight: 'bold', flex: 2, size: 'md' },
            ],
          },
          { type: 'separator', margin: 'md' },
          {
            type: 'text',
            text: '⚠️ อาการที่พบ',
            weight: 'bold',
            color: '#E65100',
            size: 'sm',
            margin: 'md',
          },
          {
            type: 'text',
            text: description,
            wrap: true,
            color: '#333333',
            size: 'md',
            margin: 'sm',
          },
          { type: 'separator', margin: 'md' },
          {
            type: 'text',
            text: `🕐 ${timeStr}`,
            color: '#999999',
            size: 'xs',
            margin: 'sm',
          },
        ],
      } as messagingApi.FlexBox,
      footer: {
        type: 'box',
        layout: 'horizontal',
        paddingAll: '12px',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#1565C0',
            height: 'sm',
            action: {
              type: 'postback',
              label: 'รับงานซ่อม',
              data: `action=accept&ticketId=${ticketId}`,
              displayText: `รับงานซ่อม Ticket #${ticketId}`,
            },
          },
          {
            type: 'button',
            style: 'primary',
            color: '#2E7D32',
            height: 'sm',
            action: {
              type: 'postback',
              label: 'ซ่อมเสร็จแล้ว',
              data: `action=resolve&ticketId=${ticketId}`,
              displayText: `ซ่อมเสร็จแล้ว Ticket #${ticketId}`,
            },
          },
        ],
      } as messagingApi.FlexBox,
    } as messagingApi.FlexBubble,
  };
}

// ── Send Ticket Notification ───────────────────────────────
export async function sendTicketNotification(
  lineUserId: string,
  info: TicketInfo
): Promise<void> {
  const client = getClient();
  const message = buildTicketFlexMessage(info);
  console.log('[LINE] pushMessage payload:', JSON.stringify({ to: lineUserId, messages: [message] }, null, 2));
  try {
    await client.pushMessage({
      to: lineUserId,
      messages: [message],
    });
  } catch (err: unknown) {
    // Log the raw LINE API error body so we know exactly which field is wrong
    console.error('[LINE] pushMessage failed — raw error:');
    if (err && typeof err === 'object') {
      const e = err as Record<string, unknown>;
      console.error('  status  :', e['status'] ?? e['statusCode']);
      console.error('  message :', e['message']);
      console.error('  body    :', JSON.stringify(e['body'] ?? e['originalError'], null, 2));
      console.error('  all keys:', Object.getOwnPropertyNames(e));
    } else {
      console.error('  raw:', err);
    }
    throw err; // re-throw so caller's .catch() also fires
  }
}

// ── Send Reply Text ────────────────────────────────────────
export async function sendReply(
  replyToken: string,
  text: string
): Promise<void> {
  const client = getClient();
  await client.replyMessage({
    replyToken,
    messages: [{ type: 'text', text }],
  });
}
