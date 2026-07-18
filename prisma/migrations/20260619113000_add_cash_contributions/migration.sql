ALTER TABLE `ClotureJournee` ADD COLUMN `totalApports` DECIMAL(15, 2) NOT NULL DEFAULT 0;
ALTER TABLE `ClotureJournee` ADD COLUMN `totalRetraitsApports` DECIMAL(15, 2) NOT NULL DEFAULT 0;

CREATE TABLE `Apport` (
  `apportId` VARCHAR(191) NOT NULL,
  `boutiqueId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `libelle` VARCHAR(191) NOT NULL,
  `montant` DECIMAL(15, 2) NOT NULL,
  `montantRestant` DECIMAL(15, 2) NOT NULL,
  `methodePaiement` ENUM('ESPECES', 'MOBILE_MONEY', 'BANQUE') NOT NULL,
  `referencePaiement` VARCHAR(191) NULL,
  `notes` VARCHAR(191) NULL,
  `statut` ENUM('EN_COURS', 'PARTIELLEMENT_RECUPERE', 'RECUPERE') NOT NULL DEFAULT 'EN_COURS',
  `dateApport` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`apportId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RetraitApport` (
  `retraitApportId` VARCHAR(191) NOT NULL,
  `apportId` VARCHAR(191) NOT NULL,
  `boutiqueId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `montant` DECIMAL(15, 2) NOT NULL,
  `notes` VARCHAR(191) NULL,
  `dateRetrait` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`retraitApportId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `Apport_boutiqueId_idx` ON `Apport`(`boutiqueId`);
CREATE INDEX `Apport_userId_idx` ON `Apport`(`userId`);
CREATE INDEX `Apport_statut_idx` ON `Apport`(`statut`);
CREATE INDEX `Apport_dateApport_idx` ON `Apport`(`dateApport`);
CREATE INDEX `Apport_methodePaiement_idx` ON `Apport`(`methodePaiement`);
CREATE INDEX `RetraitApport_apportId_idx` ON `RetraitApport`(`apportId`);
CREATE INDEX `RetraitApport_boutiqueId_idx` ON `RetraitApport`(`boutiqueId`);
CREATE INDEX `RetraitApport_userId_idx` ON `RetraitApport`(`userId`);
CREATE INDEX `RetraitApport_dateRetrait_idx` ON `RetraitApport`(`dateRetrait`);

ALTER TABLE `Apport` ADD CONSTRAINT `Apport_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`boutiqueId`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Apport` ADD CONSTRAINT `Apport_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `RetraitApport` ADD CONSTRAINT `RetraitApport_apportId_fkey` FOREIGN KEY (`apportId`) REFERENCES `Apport`(`apportId`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `RetraitApport` ADD CONSTRAINT `RetraitApport_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`boutiqueId`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `RetraitApport` ADD CONSTRAINT `RetraitApport_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;
