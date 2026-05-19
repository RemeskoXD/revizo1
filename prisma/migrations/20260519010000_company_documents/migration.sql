-- CreateTable
CREATE TABLE `CompanyDocument` (
  `id`            VARCHAR(191) NOT NULL,
  `ownerId`       VARCHAR(191) NOT NULL,
  `title`         VARCHAR(255) NOT NULL,
  `category`      VARCHAR(80)  NULL,
  `fileBase64`    LONGTEXT     NULL,
  `fileMimeType`  VARCHAR(120) NULL,
  `fileName`      VARCHAR(255) NULL,
  `validUntil`    DATETIME(3)  NULL,
  `notes`         TEXT         NULL,
  `subjectName`   VARCHAR(160) NULL,
  `subjectUserId` VARCHAR(60)  NULL,
  `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)  NOT NULL,
  INDEX `CompanyDocument_ownerId_validUntil_idx` (`ownerId`, `validUntil`),
  INDEX `CompanyDocument_subjectUserId_idx` (`subjectUserId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CompanyDocument`
  ADD CONSTRAINT `CompanyDocument_ownerId_fkey`
  FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
