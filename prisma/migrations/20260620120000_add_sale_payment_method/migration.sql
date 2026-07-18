-- Add payment method tracking for direct sale payments.
ALTER TABLE `Vente` ADD COLUMN `methodePaiement` ENUM('ESPECES', 'MOBILE_MONEY', 'BANQUE') NOT NULL DEFAULT 'ESPECES';
