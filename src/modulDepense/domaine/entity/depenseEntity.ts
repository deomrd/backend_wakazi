import { CategorieDepense, MethodePaiement, RoleNom } from "@prisma/client";
import { DateRangeFilter } from "../../../shared/filters/queryFilters";

export interface DepenseActorEntity {
  userId: string;
  role: RoleNom;
}

export interface CreateDepenseEntity {
  userId: string;
  categorie: CategorieDepense;
  libelle: string;
  montant: number;
  methodePaiement: MethodePaiement;
  referencePaiement?: string;
  notes?: string;
  dateDepense?: Date;
}

export interface UpdateDepenseEntity {
  categorie?: CategorieDepense;
  libelle?: string;
  montant?: number;
  methodePaiement?: MethodePaiement;
  referencePaiement?: string | null;
  notes?: string | null;
  dateDepense?: Date;
}

export interface DepenseListFilter extends DateRangeFilter {
  categorie?: CategorieDepense;
  methodePaiement?: MethodePaiement;
  userId?: string;
  search?: string;
}
