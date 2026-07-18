import { MethodePaiement, StatutAchat, StatutDette } from "@prisma/client";
import { DateRangeFilter } from "../../../shared/filters/queryFilters";

export interface CreateFournisseurEntity {
  nom: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  notes?: string;
}

export interface UpdateFournisseurEntity extends Partial<CreateFournisseurEntity> {
  statut?: boolean;
}

export interface CreateLigneAchatEntity {
  produitId: string;
  quantite: number;
  prixAchat: number;
}

export interface CreateAchatEntity {
  userId: string;
  fournisseurId?: string;
  montantPaye?: number;
  methodePaiement?: MethodePaiement;
  reference?: string;
  notes?: string;
  dateEcheance?: Date;
  lignes: CreateLigneAchatEntity[];
}

export interface PayDetteFournisseurEntity {
  detteFournisseurId: string;
  userId: string;
  montant: number;
  methode: MethodePaiement;
  reference?: string;
}

export interface FournisseurListFilter {
  search?: string;
  actif?: boolean;
}

export interface AchatListFilter extends DateRangeFilter {
  fournisseurId?: string;
  statut?: StatutAchat;
  search?: string;
}

export interface DetteFournisseurListFilter extends DateRangeFilter {
  fournisseurId?: string;
  statut?: StatutDette;
  search?: string;
}
