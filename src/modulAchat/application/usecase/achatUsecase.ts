import { PaginationParams } from "../../../shared/pagination/pagination";
import {
  AchatListFilter,
  CreateAchatEntity,
  CreateFournisseurEntity,
  DetteFournisseurListFilter,
  FournisseurListFilter,
  PayDetteFournisseurEntity,
  UpdateFournisseurEntity,
} from "../../domaine/entity/achatEntity";
import { AchatRepository } from "../../domaine/repository/achatRepository";

export class AchatUseCase {
  constructor(private readonly repository: AchatRepository) {}

  createFournisseur(boutiqueId: string, data: CreateFournisseurEntity) { return this.repository.createFournisseur(boutiqueId, data); }
  listFournisseurs(boutiqueId: string, pagination: PaginationParams, filters: FournisseurListFilter) { return this.repository.listFournisseurs(boutiqueId, pagination, filters); }
  getFournisseurById(boutiqueId: string, fournisseurId: string) { return this.repository.getFournisseurById(boutiqueId, fournisseurId); }
  updateFournisseur(boutiqueId: string, fournisseurId: string, data: UpdateFournisseurEntity) { return this.repository.updateFournisseur(boutiqueId, fournisseurId, data); }
  deactivateFournisseur(boutiqueId: string, fournisseurId: string) { return this.repository.deactivateFournisseur(boutiqueId, fournisseurId); }
  createAchat(boutiqueId: string, data: CreateAchatEntity) { return this.repository.createAchat(boutiqueId, data); }
  listAchats(boutiqueId: string, pagination: PaginationParams, filters: AchatListFilter) { return this.repository.listAchats(boutiqueId, pagination, filters); }
  getAchatById(boutiqueId: string, achatId: string) { return this.repository.getAchatById(boutiqueId, achatId); }
  listDettesFournisseurs(boutiqueId: string, pagination: PaginationParams, filters: DetteFournisseurListFilter) { return this.repository.listDettesFournisseurs(boutiqueId, pagination, filters); }
  payDetteFournisseur(boutiqueId: string, data: PayDetteFournisseurEntity) { return this.repository.payDetteFournisseur(boutiqueId, data); }
}
