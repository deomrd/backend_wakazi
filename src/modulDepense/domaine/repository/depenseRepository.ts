import { CreateDepenseEntity, DepenseActorEntity, DepenseListFilter, UpdateDepenseEntity } from "../entity/depenseEntity";
import { PaginatedResult, PaginationParams } from "../../../shared/pagination/pagination";

export interface DepenseRepository {
  createDepense(boutiqueId: string, actor: DepenseActorEntity, depense: CreateDepenseEntity): Promise<unknown>;
  listDepenses(
    boutiqueId: string,
    actor: DepenseActorEntity,
    pagination: PaginationParams,
    filters: DepenseListFilter
  ): Promise<PaginatedResult<unknown>>;
  getDepenseById(boutiqueId: string, actor: DepenseActorEntity, depenseId: string): Promise<unknown | null>;
  updateDepense(
    boutiqueId: string,
    actor: DepenseActorEntity,
    depenseId: string,
    depense: UpdateDepenseEntity
  ): Promise<unknown>;
  deleteDepense(boutiqueId: string, actor: DepenseActorEntity, depenseId: string): Promise<void>;
}
