import { TypeStock, UniteMesure } from "@prisma/client";
import { DateRangeFilter } from "../../../shared/filters/queryFilters";

export interface CategorieEntity {
  categorieId: string;
  nom: string;
  boutiqueId: string;
}

export interface ProduitEntity {
  produitId: string;
  nom: string;
  description?: string | null;
  photo?: string | null;
  prixAchat: string;
  prixVente: string;
  stockActuel: string;
  dateExpiration?: Date | null;
  codeQR?: string;
  boutiqueId: string;
  uniteMesure: UniteMesure;
  categorieId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProduitEntity {
  nom: string;
  description?: string;
  photo?: string;
  prixAchat: number;
  prixVente: number;
  stockActuel?: number;
  dateExpiration?: Date;
  codeQR?: string;
  uniteMesure?: UniteMesure;
  categorieId?: string;
}

export interface UpdateProduitEntity {
  nom?: string;
  description?: string | null;
  photo?: string | null;
  prixAchat?: number;
  prixVente?: number;
  dateExpiration?: Date | null;
  codeQR?: string;
  uniteMesure?: UniteMesure;
  categorieId?: string | null;
}

export interface StockMovementEntity {
  stockId: string;
  produitId: string;
  type: TypeStock;
  quantite: string;
  raison?: string | null;
  createdAt: Date;
}

export interface CreateStockMovementEntity {
  produitId: string;
  type: TypeStock;
  quantite: number;
  raison?: string;
}

export interface CreateRavitaillementEntity {
  produitId: string;
  userId: string;
  quantite: number;
  prixAchatUnitaire?: number;
  fournisseur?: string;
  numeroReference?: string;
  notes?: string;
}

export interface CategorieListFilter {
  search?: string;
}

export interface ProduitListFilter {
  search?: string;
  categorieId?: string;
  uniteMesure?: UniteMesure;
  stockFaible?: boolean;
}

export interface StockMovementListFilter extends DateRangeFilter {
  produitId?: string;
  type?: TypeStock;
}

export interface RavitaillementListFilter extends DateRangeFilter {
  produitId?: string;
  userId?: string;
  search?: string;
}
