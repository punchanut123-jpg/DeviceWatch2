-- สร้างตาราง device_status_log สำหรับ audit log การเปลี่ยนสถานะชิ้นส่วน
CREATE TABLE `device_status_log` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `deviceId` INT NOT NULL,
  `fromStatus` VARCHAR(191) NOT NULL,
  `toStatus` VARCHAR(191) NOT NULL,
  `changedBy` INT NOT NULL,
  `source` VARCHAR(50) NOT NULL DEFAULT 'manual', -- 'manual' | 'ticket' | 'preset_change'
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Index สำหรับ query ประวัติของ device
CREATE INDEX `idx_device_status_log_deviceId` ON `device_status_log`(`deviceId`);

-- Foreign key
ALTER TABLE `device_status_log` ADD CONSTRAINT `fk_device_status_log_device` FOREIGN KEY (`deviceId`) REFERENCES `device`(`id`) ON DELETE CASCADE;
ALTER TABLE `device_status_log` ADD CONSTRAINT `fk_device_status_log_user` FOREIGN KEY (`changedBy`) REFERENCES `user`(`id`) ON DELETE CASCADE;