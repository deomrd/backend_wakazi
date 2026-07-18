import { TypeEntreprise } from "@prisma/client";

export interface ParametreBoutiqueEntity {
  boutiqueId: string;
  nom: string;
  adresse: string | null;
  devise: string;
  deviseSecondaire: string | null;
  tauxDeviseSecondaire: unknown | null;
  RCCM: string | null;
  typeEntreprise: TypeEntreprise;
  createdAt: Date;
  updatedAt: Date;
}

export type BoutiqueFieldUpdate =
  | { nom: string }
  | { adresse: string | null }
  | { devise: string }
  | { deviseSecondaire: string | null }
  | { tauxDeviseSecondaire: number | null }
  | { RCCM: string | null }
  | { typeEntreprise: TypeEntreprise };
