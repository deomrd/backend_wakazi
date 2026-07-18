ALTER TABLE `User`
  ADD COLUMN `nomUtilisateur` VARCHAR(191) NULL,
  ADD COLUMN `adresse` VARCHAR(191) NULL,
  ADD COLUMN `doitChangerPin` BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX `User_nomUtilisateur_key` ON `User`(`nomUtilisateur`);
CREATE INDEX `User_nomUtilisateur_idx` ON `User`(`nomUtilisateur`);
