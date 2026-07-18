import { ClotureListFilter, CreateClotureJourneeEntity, CloturePreviewEntity } from "../entity/clotureEntity";
import { PaginatedResult, PaginationParams } from "../../../shared/pagination/pagination";

export interface ClotureRepository {
  previewClotureJournee(boutiqueId: string, data: CloturePreviewEntity): Promise<unknown>;
  createClotureJournee(boutiqueId: string, userId: string, data: CreateClotureJourneeEntity): Promise<unknown>;
  listCloturesJournee(
    boutiqueId: string,
    pagination: PaginationParams,
    filters: ClotureListFilter
  ): Promise<PaginatedResult<unknown>>;
  getClotureJourneeById(boutiqueId: string, clotureJourneeId: string): Promise<unknown | null>;
}
