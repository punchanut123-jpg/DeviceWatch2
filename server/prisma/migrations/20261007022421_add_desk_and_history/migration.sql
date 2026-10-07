-- AlterTable
ALTER TABLE `device` ADD COLUMN `deskId` INTEGER NULL;

-- CreateTable
CREATE TABLE `Desk` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(191) NOT NULL,
    `x` DOUBLE NULL,
    `y` DOUBLE NULL,
    `roomId` INTEGER NOT NULL,

    INDEX `Desk_roomId_idx`(`roomId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LayoutHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `roomId` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `adminName` VARCHAR(191) NOT NULL,
    `summary` TEXT NOT NULL,
    `snapshot` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LayoutHistory_roomId_idx`(`roomId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Desk` ADD CONSTRAINT `Desk_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Device` ADD CONSTRAINT `Device_deskId_fkey` FOREIGN KEY (`deskId`) REFERENCES `Desk`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LayoutHistory` ADD CONSTRAINT `LayoutHistory_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
