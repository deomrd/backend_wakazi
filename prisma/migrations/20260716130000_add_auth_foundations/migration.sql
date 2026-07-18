ALTER TABLE `User`
  ADD COLUMN `authVersion` INTEGER NOT NULL DEFAULT 0;

DELETE duplicateRole
FROM `UserRole` AS duplicateRole
INNER JOIN `UserRole` AS keptRole
  ON duplicateRole.`userId` = keptRole.`userId`
  AND duplicateRole.`boutiqueId` = keptRole.`boutiqueId`
  AND (
    duplicateRole.`createdAt` > keptRole.`createdAt`
    OR (duplicateRole.`createdAt` = keptRole.`createdAt` AND duplicateRole.`userRoleId` > keptRole.`userRoleId`)
  );

CREATE UNIQUE INDEX `UserRole_userId_boutiqueId_key`
  ON `UserRole`(`userId`, `boutiqueId`);
