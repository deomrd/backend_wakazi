import { MethodePaiement, StatutDette, StatutVente } from "@prisma/client";
import { DateRangeFilter } from "../../../shared/filters/queryFilters";

export interface CreateClientEntity {
  nom: string;
  telephone?: string;
}

export interface CreateLigneVenteEntity {
  produitId: string;
  quantite: number;
  prixUnitaire?: number;
}

export interface CreateVenteEntity {
  userId: string;
  clientId?: string;
  montantPaye?: number;
  montantPayeDevisePaiement?: number;
  devisePaiement?: string;
  methodePaiement?: MethodePaiement;
  lignes: CreateLigneVenteEntity[];
}

export interface PayDetteEntity {
  detteId: string;
  montant: number;
  montantDevisePaiement?: number;
  devisePaiement?: string;
  methode: MethodePaiement;
}

export interface CancelVenteEntity {
  venteId: string;
  userId: string;
  motif: string;
}

export interface RefundVenteEntity {
  venteId: string;
  userId: string;
  motif: string;
  methode: MethodePaiement;
  lignes: Array<{ produitId: string; quantite: number }>;
}

export interface ClientListFilter {
  search?: string;
}

export interface VenteListFilter extends DateRangeFilter {
  clientId?: string;
  statut?: StatutVente;
  methodePaiement?: MethodePaiement;
  search?: string;
}

export interface DetteListFilter extends DateRangeFilter {
  clientId?: string;
  statut?: StatutDette;
  search?: string;
}
