import { ClotureListFilter, CreateClotureJourneeEntity, CloturePreviewEntity } from "../../domaine/entity/clotureEntity";
import { ClotureRepository } from "../../domaine/repository/clotureRepository";
import { PaginationParams } from "../../../shared/pagination/pagination";

export class ClotureUseCase {
  constructor(private readonly clotureRepository: ClotureRepository) {}

  previewClotureJournee(boutiqueId: string, data: CloturePreviewEntity) {
    return this.clotureRepository.previewClotureJournee(boutiqueId, data);
  }

  createClotureJournee(boutiqueId: string, userId: string, data: CreateClotureJourneeEntity) {
    return this.clotureRepository.createClotureJournee(boutiqueId, userId, data);
  }

  listCloturesJournee(boutiqueId: string, pagination: PaginationParams, filters: ClotureListFilter) {
    return this.clotureRepository.listCloturesJournee(boutiqueId, pagination, filters);
  }

  getClotureJourneeById(boutiqueId: string, clotureJourneeId: string) {
    return this.clotureRepository.getClotureJourneeById(boutiqueId, clotureJourneeId);
  }
}
