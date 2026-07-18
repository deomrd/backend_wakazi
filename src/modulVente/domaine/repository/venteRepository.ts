import { CancelVenteEntity, ClientListFilter, CreateClientEntity, CreateVenteEntity, DetteListFilter, PayDetteEntity, RefundVenteEntity, VenteListFilter } from "../entity/venteEntity";
import { PaginatedResult, PaginationParams } from "../../../shared/pagination/pagination";

export interface VenteRepository {
  createClient(boutiqueId: string, client: CreateClientEntity): Promise<unknown>;
  listClients(boutiqueId: string, pagination: PaginationParams, filters: ClientListFilter): Promise<PaginatedResult<unknown>>;

  createVente(boutiqueId: string, vente: CreateVenteEntity): Promise<unknown>;
  listVentes(boutiqueId: string, pagination: PaginationParams, filters: VenteListFilter): Promise<PaginatedResult<unknown>>;
  getVenteById(boutiqueId: string, venteId: string): Promise<unknown | null>;
  cancelVente(boutiqueId: string, data: CancelVenteEntity): Promise<unknown>;
  refundVente(boutiqueId: string, data: RefundVenteEntity): Promise<unknown>;
  getRecuVente(boutiqueId: string, venteId: string): Promise<unknown | null>;

  listDettes(boutiqueId: string, pagination: PaginationParams, filters: DetteListFilter): Promise<PaginatedResult<unknown>>;
  payDette(boutiqueId: string, paiement: PayDetteEntity): Promise<unknown>;
}
