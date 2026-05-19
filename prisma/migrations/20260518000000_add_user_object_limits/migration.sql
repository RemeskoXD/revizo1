-- AlterTable
ALTER TABLE `User`
  ADD COLUMN `objectLimitBase` INT NOT NULL DEFAULT 0,
  ADD COLUMN `objectLimitExtraPaid` INT NOT NULL DEFAULT 0,
  ADD COLUMN `objectPackagePaid` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `objectLimitOverride` INT NULL,
  ADD COLUMN `companyTechBillingActive` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `companyTechSubscriptionId` VARCHAR(120) NULL,
  ADD COLUMN `referredByRealtorId` VARCHAR(60) NULL;

-- AddForeignKey for referredByRealtorId
ALTER TABLE `User`
  ADD CONSTRAINT `User_referredByRealtorId_fkey`
  FOREIGN KEY (`referredByRealtorId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex on User.referredByRealtorId
CREATE INDEX `User_referredByRealtorId_idx` ON `User`(`referredByRealtorId`);

-- CreateTable ReferralReward
CREATE TABLE `ReferralReward` (
  `id` VARCHAR(191) NOT NULL,
  `realtorId` VARCHAR(191) NOT NULL,
  `customerId` VARCHAR(191) NOT NULL,
  `amountCzk` INT NOT NULL DEFAULT 20,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `paidAt` DATETIME(3) NULL,
  `notes` TEXT NULL,
  UNIQUE INDEX `ReferralReward_realtorId_customerId_key`(`realtorId`, `customerId`),
  INDEX `ReferralReward_realtorId_status_idx`(`realtorId`, `status`),
  INDEX `ReferralReward_customerId_idx`(`customerId`),
  INDEX `ReferralReward_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `ReferralReward`
  ADD CONSTRAINT `ReferralReward_realtorId_fkey` FOREIGN KEY (`realtorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ReferralReward_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
