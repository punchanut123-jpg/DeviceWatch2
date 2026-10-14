-- ย้อนรอบ 2: ลบชิ้นส่วนที่สร้างโดย scripts/migrate-to-components.ts
-- แล้วคืน deviceType ของเครื่องเดิมเป็นค่าเริ่มต้น 'case'
--
-- ใช้:  c:\xampp\mysql\bin\mysql.exe -u root devicewatch < scripts/rollback-round2.sql
-- (สำรองฐานข้อมูลก่อนเสมอ:  powershell -ExecutionPolicy Bypass -File scripts/backup-db.ps1)
--
-- หมายเหตุ: ไม่มีคอลัมน์ createdAt บนตาราง device ใช้อ้างอิงจากช่วง id ที่ migrate สร้าง (2085-3113)
-- กันลบของแอดมินที่ตั้งชื่อคล้ายได้ด้วยการกรอง name NOT REGEXP '^PC-[0-9]+\$'

-- 1) ปิด tickets ที่ผูกกับชิ้นส่วนที่จะลบ (id 2085-3113 + ไม่ใช่ชื่อ PC-xx + ไม่มี log status)
DELETE t FROM ticket t
JOIN device d ON t.deviceId = d.id
WHERE d.id BETWEEN 2085 AND 3113
  AND d.name NOT REGEXP '^PC-[0-9]+$'
  AND NOT EXISTS (SELECT 1 FROM device_status_log dsl WHERE dsl.deviceId = d.id);

-- 2) ลบชิ้นส่วนที่สคริปต์สร้าง (id 2085-3113 + ไม่ใช่ชื่อ PC-xx + ไม่มี ticket ผูก + ไม่มี log status)
DELETE FROM device
WHERE id BETWEEN 2085 AND 3113
  AND name NOT REGEXP '^PC-[0-9]+$'
  AND NOT EXISTS (SELECT 1 FROM ticket t WHERE t.deviceId = device.id)
  AND NOT EXISTS (SELECT 1 FROM device_status_log dsl WHERE dsl.deviceId = device.id);

-- 3) คืน deviceType ของแถวต้นฉบับ 343 แถว (id <= 2058) เป็น 'case'
UPDATE device SET deviceType = 'case' WHERE id <= 2058;

SELECT ROW_COUNT() AS restored_devices;