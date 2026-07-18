import { MethodePaiement, StatutApport } from "@prisma/client";
import { DateRangeFilter } from "../../../shared/filters/queryFilters";

export interface CreateApportEntity {
  userId: string;
  libelle: string;
  montant: number;
  methodePaiement: MethodePaiement;
  referencePaiement?: string;
  notes?: string;
  dateApport?: Date;
}

export interface CreateRetraitApportEntity {
  userId: string;
  apportId: string;
  montant: number;
  notes?: string;
  dateRetrait?: Date;
}

export interface ApportListFilter extends DateRangeFilter {
  statut?: StatutApport;
  methodePaiement?: MethodePaiement;
  userId?: string;
  search?: string;
}
