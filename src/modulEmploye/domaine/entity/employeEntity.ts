import { RoleNom } from "@prisma/client";

export type EmployeeRoleNom = Extract<RoleNom, "GERANT" | "VENDEUR">;

export interface EmployeEntity {
  userId: string;
  nom: string;
  nomUtilisateur: string | null;
  adresse: string | null;
  statut: boolean;
  roleNom: RoleNom;
  boutiqueId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmployeEntity {
  nom: string;
  nomUtilisateur: string;
  adresse?: string;
  roleNom: EmployeeRoleNom;
}

export interface UpdateEmployeEntity {
  nom?: string;
  nomUtilisateur?: string;
  adresse?: string | null;
  roleNom?: EmployeeRoleNom;
}

export interface EmployeListFilter {
  search?: string;
  roleNom?: EmployeeRoleNom;
  statut?: boolean;
}

export interface EmployeWithDefaultPin {
  employe: EmployeEntity;
  pinParDefaut: string;
}
