-- CreateTable
CREATE TABLE `Building` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `floorPlanImage` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Floor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `buildingId` INTEGER NOT NULL,
    `floorNumber` INTEGER NOT NULL,
    `name` VARCHAR(191) NULL,
    `floorPlanImage` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Room` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `floorId` INTEGER NOT NULL,
    `roomNumber` VARCHAR(191) NOT NULL,
    `roomName` VARCHAR(191) NULL,
    `posX` DOUBLE NULL,
    `posY` DOUBLE NULL,
    `width` DOUBLE NULL,
    `height` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Device` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `roomId` INTEGER NOT NULL,
    `deviceCode` VARCHAR(191) NOT NULL,
    `deviceName` VARCHAR(191) NULL,
    `posX` DOUBLE NOT NULL,
    `posY` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'normal',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ticket` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `deviceId` INTEGER NOT NULL,
    `symptom` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `resolutionNote` VARCHAR(191) NULL,
    `reportedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Floor` ADD CONSTRAINT `Floor_buildingId_fkey` FOREIGN KEY (`buildingId`) REFERENCES `Building`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Room` ADD CONSTRAINT `Room_floorId_fkey` FOREIGN KEY (`floorId`) REFERENCES `Floor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Device` ADD CONSTRAINT `Device_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
