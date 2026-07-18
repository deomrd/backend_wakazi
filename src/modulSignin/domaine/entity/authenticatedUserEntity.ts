import { RoleNom } from "@prisma/client";

/**
 * Entité représentant les informations d'un utilisateur authentifié.
 */
export interface AuthenticatedUserEntity {
  userId: string;
  nom: string;
  nomUtilisateur?: string | null;
  telephone: string;
  motDePasse: string; // Le mot de passe haché de la base de données
  roleNom: RoleNom;
  boutiqueId: string;
  boutiqueNom: string;
  statut: boolean;
  doitChangerPin: boolean;
  authVersion: number;
}
