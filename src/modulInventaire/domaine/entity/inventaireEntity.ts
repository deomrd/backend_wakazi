import { DateRangeFilter } from "../../../shared/filters/queryFilters";

export interface CreateInventaireEntity {
  userId: string;
  notes?: string;
  lignes: Array<{ produitId: string; quantiteComptee: number }>;
}

export interface InventaireListFilter extends DateRangeFilter {
  search?: string;
}
