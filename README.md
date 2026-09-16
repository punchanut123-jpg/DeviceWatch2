# DeviceWatch — ระบบแจ้งซ่อมอุปกรณ์คอมพิวเตอร์

**คณะเทคโนโลยีสารสนเทศ มหาวิทยาลัยราชภัฏเพชรบุรี**

---

## 🚀 Setup Guide

### 1. Database (MySQL ผ่าน XAMPP)

```bash
# เปิด XAMPP แล้ว Start MySQL
# สร้าง database ชื่อ "devicewatch" ผ่าน phpMyAdmin หรือ Navicat
```

### 2. ตั้งค่า .env

แก้ไขไฟล์ `server/.env`:

```env
DATABASE_URL="mysql://root:รหัสผ่าน@localhost:3306/devicewatch"
JWT_SECRET="your-secret-key"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin1234"
LINE_CHANNEL_ACCESS_TOKEN="จาก LINE Developers Console"
LINE_CHANNEL_SECRET="จาก LINE Developers Console > Basic Settings"
```

### 3. Migrate และ Seed Database

```bash
cd server
npx prisma migrate dev --name init
npx prisma db seed
```

> ⚠️ หลัง seed ให้ใส่ `lineUserId` ของช่างประจำห้องใน `server/prisma/seed.ts` แล้ว seed ใหม่

### 4. ตั้งค่า LINE Webhook (สำหรับทดสอบ)

```bash
# Terminal 3
ngrok http 3000
# ได้ URL เช่น https://xxxx.ngrok-free.app

# ตั้ง Webhook URL ใน LINE Developers Console:
# https://xxxx.ngrok-free.app/webhook
```

### 5. รันระบบ

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev
```

เปิด http://localhost:5173

---

## 📁 โครงสร้าง Project

```
DeviceWatch/
├── server/                    # Node.js + Express + TypeScript
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.ts            # Seed data (12 ห้อง, 343 เครื่อง)
│   └── src/
│       ├── index.ts           # Entry point
│       ├── middleware/auth.ts # JWT middleware
│       ├── services/line.ts   # LINE Flex Message
│       └── routes/
│           ├── buildings.ts   # GET /api/buildings/*
│           ├── tickets.ts     # POST /api/tickets (+ rate limit)
│           ├── webhook.ts     # POST /webhook (+ signature check)
│           ├── auth.ts        # POST /api/auth/login
│           └── admin.ts       # GET/PATCH /api/admin/*
└── client/                    # React + Vite + TypeScript
    ├── public/
    │   ├── rooms/26201.jpg    # แผนผังห้อง (Map View)
    │   └── icons/             # PWA icons
    └── src/
        ├── pages/
        │   ├── Dashboard.tsx      # เลือกอาคาร/ชั้น/ห้อง
        │   ├── RoomView.tsx       # Grid + Map view + แจ้งซ่อม
        │   ├── AdminLogin.tsx     # /admin/login
        │   ├── AdminDashboard.tsx # /admin
        │   ├── AdminTickets.tsx   # /admin/tickets
        │   └── CoordHelper.tsx    # /coord-helper
        ├── context/AuthContext.tsx # JWT in memory
        └── api/client.ts          # API functions
```

---

## 🔐 Security Improvements (ฟีเจอร์ใหม่)

### 1. LINE Webhook Signature Validation
- ทุก request ที่ `/webhook` จะถูกตรวจสอบ `x-line-signature`
- ใช้ `validateSignature()` จาก `@line/bot-sdk`
- Request ที่ไม่มีหรือ signature ผิด → **401 Unauthorized**

### 2. Rate Limit for POST /api/tickets
- Max **5 tickets per IP per 15 minutes**
- เกิน → **429 Too Many Requests**
- ป้องกัน spam เครื่องเดิมซ้ำ: ถ้า device มี open ticket อยู่แล้ว → **409 Conflict**

---

## 🌐 Routes

### User (ไม่ต้อง Login)
| Path | หน้า |
|------|------|
| `/` | เลือกอาคาร → ชั้น → ห้อง |
| `/room/:id` | ดูเครื่องคอม + แจ้งซ่อม |

### Admin
| Path | หน้า |
|------|------|
| `/admin/login` | เข้าสู่ระบบ |
| `/admin` | ภาพรวม + สถิติ |
| `/admin/tickets` | จัดการ Ticket |

### Developer
| Path | หน้า |
|------|------|
| `/coord-helper` | วางพิกัดบน Map |

---

## 📝 หมายเหตุสำคัญ

- **lineUserId**: ใส่ใน `server/prisma/seed.ts` แล้ว seed ใหม่เพื่อส่ง LINE notification
- **Admin password**: เปลี่ยนใน `server/.env` ก่อน deploy จริง
- **Map View**: ใช้ได้เฉพาะห้อง 26201 — วางรูปผังจริงที่ `client/public/rooms/26201.jpg`
- **PWA**: ติดตั้งได้บนมือถือผ่าน "Add to Home Screen"
