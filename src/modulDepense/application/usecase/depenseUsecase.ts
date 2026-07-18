import { CreateDepenseEntity, DepenseActorEntity, DepenseListFilter, UpdateDepenseEntity } from "../../domaine/entity/depenseEntity";
import { DepenseRepository } from "../../domaine/repository/depenseRepository";
import { PaginationParams } from "../../../shared/pagination/pagination";

export class DepenseUseCase {
  constructor(private readonly depenseRepository: DepenseRepository) {}

  createDepense(boutiqueId: string, actor: DepenseActorEntity, depense: CreateDepenseEntity) {
    return this.depenseRepository.createDepense(boutiqueId, actor, depense);
  }

  listDepenses(boutiqueId: string, actor: DepenseActorEntity, pagination: PaginationParams, filters: DepenseListFilter) {
    return this.depenseRepository.listDepenses(boutiqueId, actor, pagination, filters);
  }

  getDepenseById(boutiqueId: string, actor: DepenseActorEntity, depenseId: string) {
    return this.depenseRepository.getDepenseById(boutiqueId, actor, depenseId);
  }

  updateDepense(boutiqueId: string, actor: DepenseActorEntity, depenseId: string, depense: UpdateDepenseEntity) {
    return this.depenseRepository.updateDepense(boutiqueId, actor, depenseId, depense);
  }

  deleteDepense(boutiqueId: string, actor: DepenseActorEntity, depenseId: string) {
    return this.depenseRepository.deleteDepense(boutiqueId, actor, depenseId);
  }
}
