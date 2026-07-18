import { ApportListFilter, CreateApportEntity, CreateRetraitApportEntity } from "../entity/apportEntity";
import { PaginatedResult, PaginationParams } from "../../../shared/pagination/pagination";

export interface ApportRepository {
  createApport(boutiqueId: string, apport: CreateApportEntity): Promise<unknown>;
  listApports(boutiqueId: string, pagination: PaginationParams, filters: ApportListFilter): Promise<PaginatedResult<unknown>>;
  getApportById(boutiqueId: string, apportId: string): Promise<unknown | null>;
  createRetrait(boutiqueId: string, retrait: CreateRetraitApportEntity): Promise<unknown>;
}
