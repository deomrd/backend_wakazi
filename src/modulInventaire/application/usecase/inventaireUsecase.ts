import { PaginationParams } from "../../../shared/pagination/pagination";
import { CreateInventaireEntity, InventaireListFilter } from "../../domaine/entity/inventaireEntity";
import { InventaireRepository } from "../../domaine/repository/inventaireRepository";

export class InventaireUseCase {
  constructor(private readonly repository: InventaireRepository) {}
  create(boutiqueId: string, data: CreateInventaireEntity) { return this.repository.create(boutiqueId, data); }
  list(boutiqueId: string, pagination: PaginationParams, filters: InventaireListFilter) { return this.repository.list(boutiqueId, pagination, filters); }
  getById(boutiqueId: string, inventaireId: string) { return this.repository.getById(boutiqueId, inventaireId); }
}
