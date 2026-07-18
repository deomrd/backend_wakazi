import { StatutClotureJournee } from "@prisma/client";
import { DateRangeFilter } from "../../../shared/filters/queryFilters";

export interface CreateClotureJourneeEntity {
  dateJournee?: Date;
  fondCaisseOuverture?: number;
  montantReelCaisse: number;
  notes?: string;
}

export interface CloturePreviewEntity {
  dateJournee?: Date;
  fondCaisseOuverture?: number;
}

export interface ClotureListFilter extends DateRangeFilter {
  statut?: StatutClotureJournee;
  userId?: string;
}
