import { PaginatedResult, PaginationParams } from "../../../shared/pagination/pagination";
import { CreateInventaireEntity, InventaireListFilter } from "../entity/inventaireEntity";

export interface InventaireRepository {
  create(boutiqueId: string, data: CreateInventaireEntity): Promise<unknown>;
  list(boutiqueId: string, pagination: PaginationParams, filters: InventaireListFilter): Promise<PaginatedResult<unknown>>;
  getById(boutiqueId: string, inventaireId: string): Promise<unknown | null>;
}
