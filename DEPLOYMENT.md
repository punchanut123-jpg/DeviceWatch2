# 🚀 DeviceWatch — Production Deployment & Security Guide

**คู่มือการนำระบบ DeviceWatch ขึ้นใช้งานบน Production Server (Server คณะ / VPS / Docker / Cloud)**  
*คณะเทคโนโลยีสารสนเทศ มหาวิทยาลัยราชภัฏเพชรบุรี*

---

## 📋 1. Pre-Launch Security Checklist Verification Report

ผลการตรวจสอบสถาปัตยกรรมและความปลอดภัยของระบบ DeviceWatch ก่อนนำขึ้น Production:

| รายการตรวจสอบ (Checklist Item) | สถานะ | รายละเอียดผลการตรวจสอบ & คำแนะนำ |
| :--- | :---: | :--- |
| **1. `.env` Protection & JWT Secret** | ✅ ผ่าน | สร้าง `.gitignore` ในทุกระดับ ป้องกัน `.env` ไม่ให้ commit เข้า git และจัดเตรียม `.env.example` โดย `JWT_SECRET` ใน production จะต้องสุ่มขึ้นใหม่ด้วย string แบบสุุ่ม (เช่น 64 ตัวอักษร) |
| **2. Dynamic CORS Control** | ✅ ผ่าน | ปรับแก้ `server/src/index.ts` ให้จำกัดเฉพาะ Domain/Origin ที่ระบุใน `CORS_ORIGIN` (ไม่ใช้ `*` หรือ hardcoded localhost) |
| **3. Rate Limiting & Anti-Spam** | ✅ ผ่าน | ยืนยัน middleware `loginRateLimit` (5 ครั้ง/15นาที) และ `ticketsRateLimit` (5 tickets/15นาที/IP) รวมถึงการเช็ค open ticket ซ้ำคงทำงานสมบูรณ์ใน Production build |
| **4. Security Headers (Helmet)** | ✅ ผ่าน | เปิดใช้งาน `helmet()` middleware เพิ่ม `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, และ HSTS ในระดับ Backend และ Nginx |
| **5. Isolation of Dev/Test Scripts** | ✅ ผ่าน | สคริปต์ทดสอบทั้งหมด (`test-security.ts`, `demo-save-flow.ts`, ฯลฯ) อยู่ในโฟลเดอร์ `server/scripts/` ซึ่งไม่ถูกนำเข้า Production bundle (`dist/`) ตอนสั่ง `npm run build` |
| **6. Database Credentials & Non-Root User** | ⚠️ ต้องตั้งค่า | แนะนำให้สร้าง MySQL User แยกต่างหาก เช่น `devicewatch_user` ที่มีสิทธิ์เฉพาะฐานข้อมูล `devicewatch` (จำกัดสิทธิ์ GRANT) แทนการใช้ `root` |
| **7. Backup Schedule & Retention** | ✅ ผ่าน | จัดเตรียมสคริปต์ `scripts/db-backup.sh` สำหรับตั้งค่า Cron Job ทำการสำรองข้อมูลรายวันพร้อมลบไฟล์สำรองเก่าเกิน 30 วันอัตโนมัติ |
| **8. Default Password Update** | ⚠️ ต้องเปลี่ยน | `ADMIN_PASSWORD` และ `TEACHER_PASSWORD` ใน `.env` ต้องเปลี่ยนจากค่า default (`admin1234`, `teacher1234`) เป็นรหัสผ่านจริงที่ปลอดภัยก่อนเปิดระบบ |
| **9. LINE Webhook Verification** | ✅ ผ่าน | มีระบบตรวจสอบ `x-line-signature` ผ่าน `@line/bot-sdk` สมบูรณ์ |

---

## 🛠️ 2. สรุปไฟล์ Configuration ทั้งหมดที่จัดเตรียมไว้

| ไฟล์ | วัตถุประสงค์การใช้งาน |
| :--- | :--- |
| [`.env.example`](file:///d:/QuizTest/DeviceWatch2/DeviceWatch/.env.example) | แม่แบบการตั้งค่า Environment Variables สำหรับ Production |
| [`ecosystem.config.js`](file:///d:/QuizTest/DeviceWatch2/DeviceWatch/ecosystem.config.js) | การตั้งค่า PM2 Process Manager สำหรับรัน Backend บน Server คณะ/VPS |
| [`nginx/devicewatch-nginx.conf`](file:///d:/QuizTest/DeviceWatch2/DeviceWatch/nginx/devicewatch-nginx.conf) | Nginx Reverse Proxy Config สำหรับ Server คณะ/VPS (Port 80/443 -> SPA & Port 3000) |
| [`server/Dockerfile`](file:///d:/QuizTest/DeviceWatch2/DeviceWatch/server/Dockerfile) | Container Build Script แบบ Multi-stage สำหรับ Node.js + Prisma Backend |
| [`server/docker-entrypoint.sh`](file:///d:/QuizTest/DeviceWatch2/DeviceWatch/server/docker-entrypoint.sh) | Entrypoint script สำหรับรัน Prisma Migration & Seed อัตโนมัติใน Docker |
| [`client/Dockerfile`](file:///d:/QuizTest/DeviceWatch2/DeviceWatch/client/Dockerfile) | Container Build Script แบบ Multi-stage (React Vite + Nginx Alpine) |
| [`docker-compose.yml`](file:///d:/QuizTest/DeviceWatch2/DeviceWatch/docker-compose.yml) | Docker Compose สำหรับรันครบทุกชิ้นส่วน (MySQL 8.0 + Backend + Nginx Frontend) |
| [`scripts/db-backup.sh`](file:///d:/QuizTest/DeviceWatch2/DeviceWatch/scripts/db-backup.sh) | สคริปต์สำรองข้อมูล MySQL อัตโนมัติผ่าน `mysqldump` |

---

## 📖 3. ขั้นตอนการ Deploy แบบ Step-by-Step (3 ทางเลือก)

### 🔹 ทางเลือก A: Deploy บน Server คณะ / VPS (PM2 + Nginx)

#### ขั้นตอนที่ 1: เตรียมสภาพแวดล้อมบน Server
```bash
# ติดตั้ง Node.js 20, MySQL 8.0, Nginx, และ PM2
sudo apt update && sudo apt install -y nodejs npm mysql-server nginx
sudo npm install -y -g pm2
```

#### ขั้นตอนที่ 2: ตั้งค่า Database & User สิทธิ์จำกัด
```sql
-- เข้าใช้งาน MySQL ในฐานะ root
sudo mysql -u root

-- สร้าง Database และ User สำหรับ DeviceWatch
CREATE DATABASE devicewatch CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'devicewatch_user'@'localhost' IDENTIFIED BY 'ตั้งรหัสผ่านจริงที่นี่';
GRANT ALL PRIVILEGES ON devicewatch.* TO 'devicewatch_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### ขั้นตอนที่ 3: Deploy Backend (Node.js + Prisma)
```bash
# 1. Clone หรือ Copy โค้ดมาที่ /var/www/devicewatch
cd /var/www/devicewatch/server

# 2. สร้างไฟล์ .env จากแม่แบบแล้วแก้ไขค่าจริง
cp .env.example .env
nano .env

# 3. ติดตั้ง Dependencies และ Build TypeScript
npm ci
npx prisma migrate deploy
npm run build

# 4. รัน Backend ด้วย PM2
cd /var/www/devicewatch
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### ขั้นตอนที่ 4: Build & Deploy Frontend (React + Nginx)
```bash
# 1. Build Frontend Static Files
cd /var/www/devicewatch/client
npm ci
npm run build

# 2. คัดลอก Nginx Config
sudo cp /var/www/devicewatch/nginx/devicewatch-nginx.conf /etc/nginx/sites-available/devicewatch
sudo ln -s /etc/nginx/sites-available/devicewatch /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### 🔹 ทางเลือก B: Deploy ด้วย Docker Compose (แนะนำถ้า Server รองรับ Docker)

คำสั่งเดียวเพื่อรันครบทั้งระบบ:

```bash
# 1. คัดลอกไฟล์ .env.example เป็น .env และตั้งค่า
cp .env.example .env
nano .env

# 2. รัน Docker Compose (Build และ Start Containers ใน background)
docker-compose up -d --build

# 3. ตรวจสอบสถานะการทำงานของทุก container
docker-compose ps

# 4. ดู Logs Backend
docker-compose logs -f server
```

---

### 🔹 ทางเลือก C: Deploy บน Cloud PaaS (Railway / Render)

1. **Database:** สร้าง MySQL Instance บน Railway / PlanetScale / Supabase แล้วนำ Connection String มาใส่ใน `DATABASE_URL`
2. **Backend Service:** เชื่อมต่อ GitHub Repository เลือก Root Directory เป็น `/server`
   - Build Command: `npm ci && npx prisma generate && npm run build`
   - Start Command: `npx prisma migrate deploy && npm start`
   - Environment Variables: ใส่ตาม `.env.example`
3. **Frontend Service:** เชื่อมต่อ Repository เลือก Root Directory เป็น `/client`
   - Build Command: `npm ci && npm run build`
   - Publish Directory: `dist`

---

## 🗄️ 4. แผนย้ายข้อมูล & สำรองข้อมูล Database (Database Plan)

### การย้ายข้อมูลจาก Local ไปยัง Production:
```bash
# 1. Export ข้อมูลจาก Local
mysqldump -u root -p devicewatch > backup_local.sql

# 2. Import ข้อมูลเข้า Production Database
mysql -u devicewatch_user -p devicewatch < backup_local.sql
```

### การตั้งค่า Automatic Backup (Cron Job รายวัน):
```bash
# เปิด Crontab editor
crontab -e

# เพิ่มบรรทัดนี้เพื่อตั้งค่าให้รันสคริปต์สำรองข้อมูลทุกเที่ยงคืน (00:00 น.)
0 0 * * * /bin/bash /var/www/devicewatch/scripts/db-backup.sh >> /var/log/devicewatch_backup.log 2>&1
```

---

## 📲 5. แผนการอัปเดต LINE Webhook หลัง Deploy จริง

เมื่อทำการ Deploy ระบบขึ้น Server และได้ Domain/IP ถาวรเรียบร้อยแล้ว:

1. เข้าไปที่ [LINE Developers Console](https://developers.line.biz/)
2. เลือก Provider และ Messaging API Channel ของคุณ
3. ไปที่แถบ **Messaging API** -> หัวข้อ **Webhook settings**
4. อัปเดต **Webhook URL** จาก URL ชั่วคราว (ngrok) เป็น URL จริงของ Production:
   ```
   https://devicewatch.it.npru.ac.th/webhook
   ```
   *(หรือ `http://[YOUR_SERVER_IP]/webhook` หากใช้ HTTP)*
5. กดปุ่ม **Verify** เพื่อทดสอบว่า LINE Server สามารถสื่อสารกับระบบของคุณได้สำเร็จ (ต้องขึ้นตอบรับว่า Success)
6. เปิดใช้งานสวิตช์ **Use webhook**
7. **ทดสอบ End-to-End Test จริง:**
   - ทดลองแจ้งซ่อมเครื่องผ่านหน้าเว็บ
   - ตรวจสอบว่าแจ้งเตือน Flex Message ถูกส่งไปยัง LINE ของอาจารย์/ช่างประจำห้องจริง
