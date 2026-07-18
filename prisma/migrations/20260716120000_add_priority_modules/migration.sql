-- Extend sales and audit statuses
ALTER TABLE `Vente`
  MODIFY `statut` ENUM('PAYEE', 'PARTIELLE', 'DETTE', 'ANNULEE', 'REMBOURSEE_PARTIELLEMENT', 'REMBOURSEE') NOT NULL,
  ADD COLUMN `annuleeAt` DATETIME(3) NULL,
  ADD COLUMN `motifAnnulation` VARCHAR(191) NULL;

ALTER TABLE `JournalAction`
  MODIFY `type` ENUM(
    'CREATION_PRODUIT', 'MODIFICATION_PRODUIT', 'SUPPRESSION_PRODUIT',
    'VENTE_CREATION', 'MISE_A_JOUR_STOCK', 'PAIEMENT_DETTE',
    'RAVITAILLEMENT', 'CLOTURE_JOURNEE', 'ABONNEMENT_CREATION',
    'DEPENSE_CREATION', 'APPORT_CREATION', 'APPORT_RETRAIT',
    'ACHAT_CREATION', 'INVENTAIRE_CREATION', 'VENTE_ANNULATION',
    'VENTE_REMBOURSEMENT', 'CAISSE_OUVERTURE', 'CAISSE_FERMETURE'
  ) NOT NULL;

CREATE TABLE `Fournisseur` (
  `fournisseurId` VARCHAR(191) NOT NULL,
  `boutiqueId` VARCHAR(191) NOT NULL,
  `nom` VARCHAR(191) NOT NULL,
  `telephone` VARCHAR(191) NULL,
  `email` VARCHAR(191) NULL,
  `adresse` VARCHAR(191) NULL,
  `notes` VARCHAR(191) NULL,
  `statut` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `Fournisseur_boutiqueId_idx`(`boutiqueId`),
  INDEX `Fournisseur_nom_idx`(`nom`),
  UNIQUE INDEX `Fournisseur_boutiqueId_nom_key`(`boutiqueId`, `nom`),
  PRIMARY KEY (`fournisseurId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Achat` (
  `achatId` VARCHAR(191) NOT NULL,
  `numeroAchat` VARCHAR(191) NOT NULL,
  `boutiqueId` VARCHAR(191) NOT NULL,
  `fournisseurId` VARCHAR(191) NULL,
  `userId` VARCHAR(191) NOT NULL,
  `montantTotal` DECIMAL(15, 2) NOT NULL,
  `montantPaye` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `resteAPayer` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `methodePaiement` ENUM('ESPECES', 'MOBILE_MONEY', 'BANQUE') NOT NULL DEFAULT 'ESPECES',
  `statut` ENUM('PAYE', 'PARTIEL', 'DETTE') NOT NULL,
  `reference` VARCHAR(191) NULL,
  `notes` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Achat_numeroAchat_key`(`numeroAchat`),
  INDEX `Achat_boutiqueId_idx`(`boutiqueId`),
  INDEX `Achat_fournisseurId_idx`(`fournisseurId`),
  INDEX `Achat_userId_idx`(`userId`),
  INDEX `Achat_createdAt_idx`(`createdAt`),
  INDEX `Achat_statut_idx`(`statut`),
  PRIMARY KEY (`achatId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LigneAchat` (
  `ligneAchatId` VARCHAR(191) NOT NULL,
  `achatId` VARCHAR(191) NOT NULL,
  `produitId` VARCHAR(191) NOT NULL,
  `quantite` DECIMAL(15, 3) NOT NULL,
  `prixAchat` DECIMAL(15, 2) NOT NULL,
  `sousTotal` DECIMAL(15, 2) NOT NULL,
  INDEX `LigneAchat_achatId_idx`(`achatId`),
  INDEX `LigneAchat_produitId_idx`(`produitId`),
  PRIMARY KEY (`ligneAchatId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `DetteFournisseur` (
  `detteFournisseurId` VARCHAR(191) NOT NULL,
  `boutiqueId` VARCHAR(191) NOT NULL,
  `fournisseurId` VARCHAR(191) NOT NULL,
  `achatId` VARCHAR(191) NOT NULL,
  `montantTotal` DECIMAL(15, 2) NOT NULL,
  `montantRestant` DECIMAL(15, 2) NOT NULL,
  `statut` ENUM('EN_COURS', 'PARTIELLE', 'PAYEE') NOT NULL,
  `dateEcheance` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `DetteFournisseur_achatId_key`(`achatId`),
  INDEX `DetteFournisseur_boutiqueId_idx`(`boutiqueId`),
  INDEX `DetteFournisseur_fournisseurId_idx`(`fournisseurId`),
  INDEX `DetteFournisseur_statut_idx`(`statut`),
  INDEX `DetteFournisseur_dateEcheance_idx`(`dateEcheance`),
  PRIMARY KEY (`detteFournisseurId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PaiementDetteFournisseur` (
  `paiementDetteFournisseurId` VARCHAR(191) NOT NULL,
  `detteFournisseurId` VARCHAR(191) NOT NULL,
  `montant` DECIMAL(15, 2) NOT NULL,
  `methode` ENUM('ESPECES', 'MOBILE_MONEY', 'BANQUE') NOT NULL,
  `reference` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `PaiementDetteFournisseur_detteFournisseurId_idx`(`detteFournisseurId`),
  INDEX `PaiementDetteFournisseur_methode_idx`(`methode`),
  PRIMARY KEY (`paiementDetteFournisseurId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Inventaire` (
  `inventaireId` VARCHAR(191) NOT NULL,
  `reference` VARCHAR(191) NOT NULL,
  `boutiqueId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `notes` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `Inventaire_reference_key`(`reference`),
  INDEX `Inventaire_boutiqueId_idx`(`boutiqueId`),
  INDEX `Inventaire_userId_idx`(`userId`),
  INDEX `Inventaire_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`inventaireId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LigneInventaire` (
  `ligneInventaireId` VARCHAR(191) NOT NULL,
  `inventaireId` VARCHAR(191) NOT NULL,
  `produitId` VARCHAR(191) NOT NULL,
  `quantiteTheorique` DECIMAL(15, 3) NOT NULL,
  `quantiteComptee` DECIMAL(15, 3) NOT NULL,
  `ecart` DECIMAL(15, 3) NOT NULL,
  INDEX `LigneInventaire_produitId_idx`(`produitId`),
  UNIQUE INDEX `LigneInventaire_inventaireId_produitId_key`(`inventaireId`, `produitId`),
  PRIMARY KEY (`ligneInventaireId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RemboursementVente` (
  `remboursementVenteId` VARCHAR(191) NOT NULL,
  `venteId` VARCHAR(191) NOT NULL,
  `boutiqueId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `montant` DECIMAL(15, 2) NOT NULL,
  `methode` ENUM('ESPECES', 'MOBILE_MONEY', 'BANQUE') NOT NULL,
  `motif` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `RemboursementVente_venteId_idx`(`venteId`),
  INDEX `RemboursementVente_boutiqueId_idx`(`boutiqueId`),
  INDEX `RemboursementVente_userId_idx`(`userId`),
  INDEX `RemboursementVente_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`remboursementVenteId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LigneRemboursementVente` (
  `ligneRemboursementVenteId` VARCHAR(191) NOT NULL,
  `remboursementVenteId` VARCHAR(191) NOT NULL,
  `produitId` VARCHAR(191) NOT NULL,
  `quantite` DECIMAL(15, 3) NOT NULL,
  `prixUnitaire` DECIMAL(15, 2) NOT NULL,
  `sousTotal` DECIMAL(15, 2) NOT NULL,
  INDEX `LigneRemboursementVente_remboursementVenteId_idx`(`remboursementVenteId`),
  INDEX `LigneRemboursementVente_produitId_idx`(`produitId`),
  PRIMARY KEY (`ligneRemboursementVenteId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Caisse` (
  `caisseId` VARCHAR(191) NOT NULL,
  `boutiqueId` VARCHAR(191) NOT NULL,
  `nom` VARCHAR(191) NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `Caisse_boutiqueId_idx`(`boutiqueId`),
  UNIQUE INDEX `Caisse_boutiqueId_nom_key`(`boutiqueId`, `nom`),
  PRIMARY KEY (`caisseId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SessionCaisse` (
  `sessionCaisseId` VARCHAR(191) NOT NULL,
  `caisseId` VARCHAR(191) NOT NULL,
  `ouverteParId` VARCHAR(191) NOT NULL,
  `fermeeParId` VARCHAR(191) NULL,
  `valideeParId` VARCHAR(191) NULL,
  `fondOuverture` DECIMAL(15, 2) NOT NULL,
  `montantAttendu` DECIMAL(15, 2) NULL,
  `montantReel` DECIMAL(15, 2) NULL,
  `ecart` DECIMAL(15, 2) NULL,
  `statut` ENUM('OUVERTE', 'FERMEE', 'VALIDEE', 'REJETEE') NOT NULL DEFAULT 'OUVERTE',
  `notesOuverture` VARCHAR(191) NULL,
  `notesFermeture` VARCHAR(191) NULL,
  `ouverteAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `fermeeAt` DATETIME(3) NULL,
  `valideeAt` DATETIME(3) NULL,
  INDEX `SessionCaisse_caisseId_idx`(`caisseId`),
  INDEX `SessionCaisse_ouverteParId_idx`(`ouverteParId`),
  INDEX `SessionCaisse_statut_idx`(`statut`),
  INDEX `SessionCaisse_ouverteAt_idx`(`ouverteAt`),
  PRIMARY KEY (`sessionCaisseId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MouvementCaisse` (
  `mouvementCaisseId` VARCHAR(191) NOT NULL,
  `sessionCaisseId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `type` ENUM('ENTREE', 'SORTIE') NOT NULL,
  `montant` DECIMAL(15, 2) NOT NULL,
  `libelle` VARCHAR(191) NOT NULL,
  `reference` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `MouvementCaisse_sessionCaisseId_idx`(`sessionCaisseId`),
  INDEX `MouvementCaisse_userId_idx`(`userId`),
  INDEX `MouvementCaisse_type_idx`(`type`),
  INDEX `MouvementCaisse_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`mouvementCaisseId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Fournisseur` ADD CONSTRAINT `Fournisseur_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`boutiqueId`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Achat` ADD CONSTRAINT `Achat_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`boutiqueId`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Achat` ADD CONSTRAINT `Achat_fournisseurId_fkey` FOREIGN KEY (`fournisseurId`) REFERENCES `Fournisseur`(`fournisseurId`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Achat` ADD CONSTRAINT `Achat_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `LigneAchat` ADD CONSTRAINT `LigneAchat_achatId_fkey` FOREIGN KEY (`achatId`) REFERENCES `Achat`(`achatId`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `LigneAchat` ADD CONSTRAINT `LigneAchat_produitId_fkey` FOREIGN KEY (`produitId`) REFERENCES `Produit`(`produitId`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `DetteFournisseur` ADD CONSTRAINT `DetteFournisseur_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`boutiqueId`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `DetteFournisseur` ADD CONSTRAINT `DetteFournisseur_fournisseurId_fkey` FOREIGN KEY (`fournisseurId`) REFERENCES `Fournisseur`(`fournisseurId`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `DetteFournisseur` ADD CONSTRAINT `DetteFournisseur_achatId_fkey` FOREIGN KEY (`achatId`) REFERENCES `Achat`(`achatId`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `PaiementDetteFournisseur` ADD CONSTRAINT `PaiementDetteFournisseur_detteFournisseurId_fkey` FOREIGN KEY (`detteFournisseurId`) REFERENCES `DetteFournisseur`(`detteFournisseurId`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Inventaire` ADD CONSTRAINT `Inventaire_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`boutiqueId`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Inventaire` ADD CONSTRAINT `Inventaire_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `LigneInventaire` ADD CONSTRAINT `LigneInventaire_inventaireId_fkey` FOREIGN KEY (`inventaireId`) REFERENCES `Inventaire`(`inventaireId`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `LigneInventaire` ADD CONSTRAINT `LigneInventaire_produitId_fkey` FOREIGN KEY (`produitId`) REFERENCES `Produit`(`produitId`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `RemboursementVente` ADD CONSTRAINT `RemboursementVente_venteId_fkey` FOREIGN KEY (`venteId`) REFERENCES `Vente`(`venteId`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `RemboursementVente` ADD CONSTRAINT `RemboursementVente_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`boutiqueId`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `RemboursementVente` ADD CONSTRAINT `RemboursementVente_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `LigneRemboursementVente` ADD CONSTRAINT `LigneRemboursementVente_remboursementVenteId_fkey` FOREIGN KEY (`remboursementVenteId`) REFERENCES `RemboursementVente`(`remboursementVenteId`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `LigneRemboursementVente` ADD CONSTRAINT `LigneRemboursementVente_produitId_fkey` FOREIGN KEY (`produitId`) REFERENCES `Produit`(`produitId`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Caisse` ADD CONSTRAINT `Caisse_boutiqueId_fkey` FOREIGN KEY (`boutiqueId`) REFERENCES `Boutique`(`boutiqueId`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `SessionCaisse` ADD CONSTRAINT `SessionCaisse_caisseId_fkey` FOREIGN KEY (`caisseId`) REFERENCES `Caisse`(`caisseId`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `SessionCaisse` ADD CONSTRAINT `SessionCaisse_ouverteParId_fkey` FOREIGN KEY (`ouverteParId`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `SessionCaisse` ADD CONSTRAINT `SessionCaisse_fermeeParId_fkey` FOREIGN KEY (`fermeeParId`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `SessionCaisse` ADD CONSTRAINT `SessionCaisse_valideeParId_fkey` FOREIGN KEY (`valideeParId`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `MouvementCaisse` ADD CONSTRAINT `MouvementCaisse_sessionCaisseId_fkey` FOREIGN KEY (`sessionCaisseId`) REFERENCES `SessionCaisse`(`sessionCaisseId`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `MouvementCaisse` ADD CONSTRAINT `MouvementCaisse_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;
