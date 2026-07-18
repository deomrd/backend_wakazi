ALTER TABLE `Boutique`
  ADD COLUMN `deviseSecondaire` VARCHAR(191) NULL,
  ADD COLUMN `tauxDeviseSecondaire` DECIMAL(15, 6) NULL;

ALTER TABLE `Vente`
  ADD COLUMN `montantPayeDevisePaiement` DECIMAL(15, 2) NULL,
  ADD COLUMN `devisePaiement` VARCHAR(191) NULL;

ALTER TABLE `PaiementDette`
  ADD COLUMN `montantDevisePaiement` DECIMAL(15, 2) NULL,
  ADD COLUMN `devisePaiement` VARCHAR(191) NULL;

ALTER TABLE `ClotureJournee`
  ADD COLUMN `totalEncaisseDevisePrincipale` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  ADD COLUMN `totalEncaisseDeviseSecondaire` DECIMAL(15, 2) NOT NULL DEFAULT 0;
