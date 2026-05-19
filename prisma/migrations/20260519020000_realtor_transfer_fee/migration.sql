-- AlterTable ReferralReward + nový source field
ALTER TABLE `ReferralReward`
  ADD COLUMN `source` VARCHAR(40) NOT NULL DEFAULT 'REF_LINK';

-- Drop old unique (realtorId, customerId) – nahradíme za (realtorId, customerId, source)
ALTER TABLE `ReferralReward`
  DROP INDEX `ReferralReward_realtorId_customerId_key`;

CREATE UNIQUE INDEX `ReferralReward_realtorId_customerId_source_key`
  ON `ReferralReward`(`realtorId`, `customerId`, `source`);

CREATE INDEX `ReferralReward_source_idx`
  ON `ReferralReward`(`source`);

-- CreateTable
CREATE TABLE `RealtorTransferFee` (
  `id`              VARCHAR(191) NOT NULL,
  `realtorId`       VARCHAR(191) NOT NULL,
  `customerId`      VARCHAR(191) NOT NULL,
  `propertyId`      VARCHAR(191) NOT NULL,
  `amountCzk`       INT NOT NULL DEFAULT 200,
  `status`          VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  `stripeInvoiceId` VARCHAR(120) NULL,
  `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `paidAt`          DATETIME(3) NULL,
  `notes`           TEXT NULL,
  UNIQUE INDEX `RealtorTransferFee_propertyId_key`(`propertyId`),
  INDEX `RealtorTransferFee_realtorId_status_idx`(`realtorId`, `status`),
  INDEX `RealtorTransferFee_customerId_idx`(`customerId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RealtorTransferFee`
  ADD CONSTRAINT `RealtorTransferFee_realtorId_fkey` FOREIGN KEY (`realtorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `RealtorTransferFee_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `RealtorTransferFee_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
