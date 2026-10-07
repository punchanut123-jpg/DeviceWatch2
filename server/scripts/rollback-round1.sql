-- ย้อนกลับรอบ 1 (เพิ่ม Desk, LayoutHistory, device.deskId)
-- รัน:  c:\xampp\mysql\bin\mysql.exe -u root devicewatch < scripts\rollback-round1.sql
-- แล้ว:  npx prisma migrate resolve --rolled-back 20261007022421_add_desk_and_history
-- หมายเหตุ: รอบ 1 เป็นการเพิ่มอย่างเดียว — ข้อมูลเดิม (posX/posY, tickets) ไม่ถูกแตะ

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `LayoutHistory`;
DROP TABLE IF EXISTS `Desk`;
ALTER TABLE `Device` DROP FOREIGN KEY `Device_deskId_fkey`;
ALTER TABLE `Device` DROP COLUMN `deskId`;

SET FOREIGN_KEY_CHECKS = 1;

DELETE FROM `_prisma_migrations` WHERE `migration_name` = '20261007022421_add_desk_and_history';
