import { TypeEntreprise } from "@prisma/client";

export interface SignupEntity {
  nom: string;
  telephone?: string;
  motDePasse: string;
  nomBoutique: string;
  typeEntreprise: TypeEntreprise;
  devise?: string;
  deviseSecondaire?: string;
  tauxDeviseSecondaire?: number;
  adresseBoutique?: string;
  RCCM?: string;
}
