-- AlterEnum
ALTER TABLE `JournalAction` MODIFY `type` ENUM('CREATION_PRODUIT', 'MODIFICATION_PRODUIT', 'SUPPRESSION_PRODUIT', 'VENTE_CREATION', 'MISE_A_JOUR_STOCK', 'PAIEMENT_DETTE', 'RAVITAILLEMENT', 'CLOTURE_JOURNEE', 'ABONNEMENT_CREATION') NOT NULL;

-- CreateTable
CREATE TABLE `Ravitaillement` (
    `ravitaillementId` VARCHAR(191) NOT NULL,
    `boutiqueId` VARCHAR(191) NOT NULL,
    `produitId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `stockId` VARCHAR(191) NULL,
    `quantite` DECIMAL(15, 3) NOT NULL,
    `stockAvant` DECIMAL(15, 3) NOT NULL,
    `stockApres` DECIMAL(15, 3) NOT NULL,
    `prixAchatUnitaire` DECIMAL(15, 2) NULL,
    `coutTotal` DECIMAL(15, 2) NULL,
    `fournisseur` VARCHAR(191) NULL,
    `numeroReference` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Ravitaillement_stockId_key`(`stockId`),
    INDEX `Ravitaillement_boutiqueId_idx`(`boutiqueId`),
    INDEX `Ravitaillement_produitId_idx`(`produitId`),
    INDEX `Ravitaillement_userId_idx`(`userId`),
    INDEX `Ravitaillement_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `Ravitaillement_boutiqueId_numeroReference_key`(`boutiqueId`, `numeroReference`),
    PRIMARY KEY (`ravitaillementId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Abonnement` (
    `abonnementId` VARCHAR(191) NOT NULL,
    `boutiqueId` VARCHAR(191) NOT NULL,
    `creeParId` VARCHAR(191) NULL,
    `plan` ENUM('ESSAI', 'MENSUEL', 'TRIMESTRIEL', 'SEMESTRIEL', 'ANNUEL', 'PERSONNALISE') NOT NULL,
    `cycleFacturation` ENUM('UNIQUE', 'MENSUEL', 'TRIMESTRIEL', 'SEMESTRIEL', 'ANNUEL') NOT NULL DEFAULT 'MENSUEL',
    `statut` ENUM('EN_ATTENTE', 'ACTIF', 'EXPIRE', 'SUSPENDU', 'ANNULE') NOT NULL DEFAULT 'EN_ATTENTE',
    `montant` DECIMAL(15, 2) NOT NULL,
    `devise` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `methodePaiement` ENUM('ESPECES', 'MOBILE_MONEY', 'BANQUE') NULL,
    `referencePaiement` VARCHAR(191) NULL,
    `dateDebut` DATETIME(3) NOT NULL,
    `dateFin` DATETIME(3) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Abonnement_boutiqueId_idx`(`boutiqueId`),
    INDEX `Abonnement_creeParId_idx`(`creeParId`),
    INDEX `Abonnement_statut_idx`(`statut`),
    INDEX `Abonnement_dateDebut_idx`(`dateDebut`),
    INDEX `Abonnement_dateFin_idx`(`dateFin`),
    PRIMARY KEY (`abonnementId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClotureJournee` (
    `clotureJourneeId` VARCHAR(191) NOT NULL,
    `boutiqueId` VARCHAR(191) NOT NULL,
    `clotureeParId` VARCHAR(191) NOT NULL,
    `valideeParId` VARCHAR(191) NULL,
    `dateJournee` DATETIME(3) NOT NULL,
    `nombreVentes` INTEGER NOT NULL DEFAULT 0,
    `totalVentes` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalMontantPaye` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalResteAPayer` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalDettesCreees` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalPaiementsDettes` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalRavitaillements` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `montantEspeces` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `montantMobileMoney` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `montantBanque` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `fondCaisseOuverture` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `montantAttenduCaisse` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `montantReelCaisse` DECIMAL(15, 2) NULL,
    `ecartCaisse` DECIMAL(15, 2) NULL,
    `statut` ENUM('CLOTUREE', 'VALIDEE', 'ANNULEE') NOT NULL DEFAULT 'CLOTUREE',
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClotureJournee_boutiqueId_idx`(`boutiqueId`),
    INDEX `ClotureJournee_clotureeParId_idx`(`clotureeParId`),
    INDEX `ClotureJournee_valideeParId_idx`(`valideeParId`),
    INDEX `ClotureJournee_dateJournee_idx`(`dateJournee`),
    INDEX `ClotureJournee_statut_idx`(`statut`),
    UNIQUE INDEX `ClotureJournee_boutiqueId_dateJournee_key`(`boutiqueId`, `dateJournee`),
    PRIMARY KEY (`clotureJourneeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Ravitaillement` ADD CONSTRAINT `Ravitaillement_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`boutiqueId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ravitaillement` ADD CONSTRAINT `Ravitaillement_produitId_fkey` FOREIGN KEY (`produitId`) REFERENCES `Produit`(`produitId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ravitaillement` ADD CONSTRAINT `Ravitaillement_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ravitaillement` ADD CONSTRAINT `Ravitaillement_stockId_fkey` FOREIGN KEY (`stockId`) REFERENCES `Stock`(`stockId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Abonnement` ADD CONSTRAINT `Abonnement_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`boutiqueId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Abonnement` ADD CONSTRAINT `Abonnement_creeParId_fkey` FOREIGN KEY (`creeParId`) REFERENCES `User`(`userId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClotureJournee` ADD CONSTRAINT `ClotureJournee_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`boutiqueId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClotureJournee` ADD CONSTRAINT `ClotureJournee_clotureeParId_fkey` FOREIGN KEY (`clotureeParId`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClotureJournee` ADD CONSTRAINT `ClotureJournee_valideeParId_fkey` FOREIGN KEY (`valideeParId`) REFERENCES `User`(`userId`) ON DELETE SET NULL ON UPDATE CASCADE;
