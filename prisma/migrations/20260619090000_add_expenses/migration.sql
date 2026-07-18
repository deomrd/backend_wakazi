-- AlterEnum
ALTER TABLE `JournalAction` MODIFY `type` ENUM('CREATION_PRODUIT', 'MODIFICATION_PRODUIT', 'SUPPRESSION_PRODUIT', 'VENTE_CREATION', 'MISE_A_JOUR_STOCK', 'PAIEMENT_DETTE', 'RAVITAILLEMENT', 'CLOTURE_JOURNEE', 'ABONNEMENT_CREATION', 'DEPENSE_CREATION') NOT NULL;

-- CreateTable
CREATE TABLE `Depense` (
    `depenseId` VARCHAR(191) NOT NULL,
    `boutiqueId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `categorie` ENUM('LOYER', 'SALAIRE', 'TRANSPORT', 'FOURNITURE', 'ELECTRICITE', 'INTERNET', 'TAXE', 'MAINTENANCE', 'AUTRE') NOT NULL,
    `libelle` VARCHAR(191) NOT NULL,
    `montant` DECIMAL(15, 2) NOT NULL,
    `methodePaiement` ENUM('ESPECES', 'MOBILE_MONEY', 'BANQUE') NOT NULL,
    `referencePaiement` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `dateDepense` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Depense_boutiqueId_idx`(`boutiqueId`),
    INDEX `Depense_userId_idx`(`userId`),
    INDEX `Depense_categorie_idx`(`categorie`),
    INDEX `Depense_dateDepense_idx`(`dateDepense`),
    INDEX `Depense_methodePaiement_idx`(`methodePaiement`),
    PRIMARY KEY (`depenseId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Depense` ADD CONSTRAINT `Depense_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`boutiqueId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Depense` ADD CONSTRAINT `Depense_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;
