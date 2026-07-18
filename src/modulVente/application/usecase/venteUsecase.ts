import { CancelVenteEntity, ClientListFilter, CreateClientEntity, CreateVenteEntity, DetteListFilter, PayDetteEntity, RefundVenteEntity, VenteListFilter } from "../../domaine/entity/venteEntity";
import { VenteRepository } from "../../domaine/repository/venteRepository";
import { PaginationParams } from "../../../shared/pagination/pagination";

export class VenteUseCase {
  constructor(private readonly venteRepository: VenteRepository) {}

  createClient(boutiqueId: string, client: CreateClientEntity) {
    return this.venteRepository.createClient(boutiqueId, client);
  }

  listClients(boutiqueId: string, pagination: PaginationParams, filters: ClientListFilter) {
    return this.venteRepository.listClients(boutiqueId, pagination, filters);
  }

  createVente(boutiqueId: string, vente: CreateVenteEntity) {
    return this.venteRepository.createVente(boutiqueId, vente);
  }

  listVentes(boutiqueId: string, pagination: PaginationParams, filters: VenteListFilter) {
    return this.venteRepository.listVentes(boutiqueId, pagination, filters);
  }

  getVenteById(boutiqueId: string, venteId: string) {
    return this.venteRepository.getVenteById(boutiqueId, venteId);
  }

  cancelVente(boutiqueId: string, data: CancelVenteEntity) {
    return this.venteRepository.cancelVente(boutiqueId, data);
  }

  refundVente(boutiqueId: string, data: RefundVenteEntity) {
    return this.venteRepository.refundVente(boutiqueId, data);
  }

  getRecuVente(boutiqueId: string, venteId: string) {
    return this.venteRepository.getRecuVente(boutiqueId, venteId);
  }

  listDettes(boutiqueId: string, pagination: PaginationParams, filters: DetteListFilter) {
    return this.venteRepository.listDettes(boutiqueId, pagination, filters);
  }

  payDette(boutiqueId: string, paiement: PayDetteEntity) {
    return this.venteRepository.payDette(boutiqueId, paiement);
  }
}
