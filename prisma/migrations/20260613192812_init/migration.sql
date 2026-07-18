-- CreateTable
CREATE TABLE `User` (
    `userId` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `telephone` VARCHAR(191) NULL,
    `motDePasse` VARCHAR(191) NOT NULL,
    `statut` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_telephone_key`(`telephone`),
    INDEX `User_nom_idx`(`nom`),
    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `roleId` VARCHAR(191) NOT NULL,
    `nom` ENUM('PROPRIETAIRE', 'GERANT', 'VENDEUR') NOT NULL,

    UNIQUE INDEX `Role_nom_key`(`nom`),
    INDEX `Role_nom_idx`(`nom`),
    PRIMARY KEY (`roleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserRole` (
    `userRoleId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `boutiqueId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`userRoleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Boutique` (
    `boutiqueId` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `adresse` VARCHAR(191) NULL,
    `devise` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `RCCM` VARCHAR(191) NULL,
    `typeEntreprise` ENUM('PHARMACIE', 'QUINCAILLERIE', 'BOUCHERIE', 'CHARCUTERIE', 'BOULANGERIE', 'BOUTIQUE_ALIMENTAIRE', 'BOUTIQUE_HABILLEMENT', 'SUPERMARCHE', 'AUTRE') NOT NULL,
    `proprietaireId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Boutique_RCCM_key`(`RCCM`),
    PRIMARY KEY (`boutiqueId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Produit` (
    `produitId` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `photo` VARCHAR(191) NULL,
    `prixAchat` DECIMAL(15, 2) NOT NULL,
    `prixVente` DECIMAL(15, 2) NOT NULL,
    `stockActuel` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `dateExpiration` DATETIME(3) NULL,
    `codeQR` VARCHAR(191) NOT NULL,
    `boutiqueId` VARCHAR(191) NOT NULL,
    `uniteMesure` ENUM('Kilogramme', 'Gramme', 'Milligramme', 'Livre', 'Once', 'Litre', 'Millilitre', 'Gallon', 'Pieces', 'Boite', 'Paquet', 'Rouleau', 'Autre') NOT NULL DEFAULT 'Pieces',
    `categorieId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Produit_codeQR_key`(`codeQR`),
    INDEX `Produit_nom_idx`(`nom`),
    INDEX `Produit_prixAchat_idx`(`prixAchat`),
    INDEX `Produit_prixVente_idx`(`prixVente`),
    INDEX `Produit_boutiqueId_idx`(`boutiqueId`),
    UNIQUE INDEX `Produit_nom_boutiqueId_key`(`nom`, `boutiqueId`),
    PRIMARY KEY (`produitId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Categorie` (
    `categorieId` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `boutiqueId` VARCHAR(191) NOT NULL,

    INDEX `Categorie_nom_idx`(`nom`),
    UNIQUE INDEX `Categorie_nom_boutiqueId_key`(`nom`, `boutiqueId`),
    PRIMARY KEY (`categorieId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Stock` (
    `stockId` VARCHAR(191) NOT NULL,
    `produitId` VARCHAR(191) NOT NULL,
    `type` ENUM('ENTREE', 'SORTIE', 'AJUSTEMENT') NOT NULL,
    `quantite` DECIMAL(15, 3) NOT NULL,
    `raison` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Stock_type_idx`(`type`),
    PRIMARY KEY (`stockId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vente` (
    `venteId` VARCHAR(191) NOT NULL,
    `numeroVente` VARCHAR(191) NOT NULL,
    `boutiqueId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NULL,
    `montantTotal` DECIMAL(15, 2) NOT NULL,
    `montantPaye` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `resteAPayer` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `statut` ENUM('PAYEE', 'PARTIELLE', 'DETTE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Vente_numeroVente_key`(`numeroVente`),
    INDEX `Vente_montantTotal_idx`(`montantTotal`),
    INDEX `Vente_statut_idx`(`statut`),
    INDEX `Vente_createdAt_idx`(`createdAt`),
    INDEX `Vente_userId_idx`(`userId`),
    PRIMARY KEY (`venteId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LigneVente` (
    `ligneVenteId` VARCHAR(191) NOT NULL,
    `venteId` VARCHAR(191) NOT NULL,
    `produitId` VARCHAR(191) NOT NULL,
    `quantite` DECIMAL(15, 3) NOT NULL,
    `prixAchat` DECIMAL(15, 2) NOT NULL,
    `prixUnitaire` DECIMAL(15, 2) NOT NULL,
    `sousTotal` DECIMAL(15, 2) NOT NULL,

    INDEX `LigneVente_venteId_idx`(`venteId`),
    INDEX `LigneVente_produitId_idx`(`produitId`),
    PRIMARY KEY (`ligneVenteId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Client` (
    `clientId` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `telephone` VARCHAR(191) NULL,
    `boutiqueId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Client_telephone_key`(`telephone`),
    INDEX `Client_nom_idx`(`nom`),
    PRIMARY KEY (`clientId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Dette` (
    `detteId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `venteId` VARCHAR(191) NOT NULL,
    `boutiqueId` VARCHAR(191) NOT NULL,
    `montantTotal` DECIMAL(15, 2) NOT NULL,
    `montantRestant` DECIMAL(15, 2) NOT NULL,
    `statut` ENUM('EN_COURS', 'PARTIELLE', 'PAYEE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Dette_venteId_key`(`venteId`),
    INDEX `Dette_statut_idx`(`statut`),
    INDEX `Dette_montantRestant_idx`(`montantRestant`),
    PRIMARY KEY (`detteId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaiementDette` (
    `paiementDetteId` VARCHAR(191) NOT NULL,
    `detteId` VARCHAR(191) NOT NULL,
    `montant` DECIMAL(15, 2) NOT NULL,
    `methode` ENUM('ESPECES', 'MOBILE_MONEY', 'BANQUE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PaiementDette_detteId_idx`(`detteId`),
    INDEX `PaiementDette_methode_idx`(`methode`),
    PRIMARY KEY (`paiementDetteId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JournalAction` (
    `journalActionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('CREATION_PRODUIT', 'MODIFICATION_PRODUIT', 'SUPPRESSION_PRODUIT', 'VENTE_CREATION', 'MISE_A_JOUR_STOCK', 'PAIEMENT_DETTE') NOT NULL,
    `entite` VARCHAR(191) NULL,
    `entiteId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `JournalAction_userId_idx`(`userId`),
    INDEX `JournalAction_type_idx`(`type`),
    INDEX `JournalAction_entite_idx`(`entite`),
    INDEX `JournalAction_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`journalActionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`roleId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`boutiqueId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Boutique` ADD CONSTRAINT `Boutique_proprietaireId_fkey` FOREIGN KEY (`proprietaireId`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Produit` ADD CONSTRAINT `Produit_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`boutiqueId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Produit` ADD CONSTRAINT `Produit_categorieId_fkey` FOREIGN KEY (`categorieId`) REFERENCES `Categorie`(`categorieId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Categorie` ADD CONSTRAINT `Categorie_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`boutiqueId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Stock` ADD CONSTRAINT `Stock_produitId_fkey` FOREIGN KEY (`produitId`) REFERENCES `Produit`(`produitId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vente` ADD CONSTRAINT `Vente_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`boutiqueId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vente` ADD CONSTRAINT `Vente_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vente` ADD CONSTRAINT `Vente_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`clientId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneVente` ADD CONSTRAINT `LigneVente_venteId_fkey` FOREIGN KEY (`venteId`) REFERENCES `Vente`(`venteId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneVente` ADD CONSTRAINT `LigneVente_produitId_fkey` FOREIGN KEY (`produitId`) REFERENCES `Produit`(`produitId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Client` ADD CONSTRAINT `Client_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`boutiqueId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dette` ADD CONSTRAINT `Dette_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`clientId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dette` ADD CONSTRAINT `Dette_venteId_fkey` FOREIGN KEY (`venteId`) REFERENCES `Vente`(`venteId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dette` ADD CONSTRAINT `Dette_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`boutiqueId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaiementDette` ADD CONSTRAINT `PaiementDette_detteId_fkey` FOREIGN KEY (`detteId`) REFERENCES `Dette`(`detteId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JournalAction` ADD CONSTRAINT `JournalAction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;
