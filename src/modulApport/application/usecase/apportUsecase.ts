import { ApportListFilter, CreateApportEntity, CreateRetraitApportEntity } from "../../domaine/entity/apportEntity";
import { ApportRepository } from "../../domaine/repository/apportRepository";
import { PaginationParams } from "../../../shared/pagination/pagination";

export class ApportUseCase {
  constructor(private readonly apportRepository: ApportRepository) {}

  createApport(boutiqueId: string, apport: CreateApportEntity) {
    return this.apportRepository.createApport(boutiqueId, apport);
  }

  listApports(boutiqueId: string, pagination: PaginationParams, filters: ApportListFilter) {
    return this.apportRepository.listApports(boutiqueId, pagination, filters);
  }

  getApportById(boutiqueId: string, apportId: string) {
    return this.apportRepository.getApportById(boutiqueId, apportId);
  }

  createRetrait(boutiqueId: string, retrait: CreateRetraitApportEntity) {
    return this.apportRepository.createRetrait(boutiqueId, retrait);
  }
}
