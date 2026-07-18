import { PaginatedResult, PaginationParams } from "../../../shared/pagination/pagination";
import {
  AchatListFilter,
  CreateAchatEntity,
  CreateFournisseurEntity,
  DetteFournisseurListFilter,
  FournisseurListFilter,
  PayDetteFournisseurEntity,
  UpdateFournisseurEntity,
} from "../entity/achatEntity";

export interface AchatRepository {
  createFournisseur(boutiqueId: string, data: CreateFournisseurEntity): Promise<unknown>;
  listFournisseurs(boutiqueId: string, pagination: PaginationParams, filters: FournisseurListFilter): Promise<PaginatedResult<unknown>>;
  getFournisseurById(boutiqueId: string, fournisseurId: string): Promise<unknown | null>;
  updateFournisseur(boutiqueId: string, fournisseurId: string, data: UpdateFournisseurEntity): Promise<unknown>;
  deactivateFournisseur(boutiqueId: string, fournisseurId: string): Promise<unknown>;
  createAchat(boutiqueId: string, data: CreateAchatEntity): Promise<unknown>;
  listAchats(boutiqueId: string, pagination: PaginationParams, filters: AchatListFilter): Promise<PaginatedResult<unknown>>;
  getAchatById(boutiqueId: string, achatId: string): Promise<unknown | null>;
  listDettesFournisseurs(boutiqueId: string, pagination: PaginationParams, filters: DetteFournisseurListFilter): Promise<PaginatedResult<unknown>>;
  payDetteFournisseur(boutiqueId: string, data: PayDetteFournisseurEntity): Promise<unknown>;
}
