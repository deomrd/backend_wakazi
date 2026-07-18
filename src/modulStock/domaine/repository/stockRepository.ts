import {
  CategorieEntity,
  CategorieListFilter,
  CreateProduitEntity,
  CreateRavitaillementEntity,
  CreateStockMovementEntity,
  ProduitEntity,
  ProduitListFilter,
  RavitaillementListFilter,
  StockMovementEntity,
  StockMovementListFilter,
  UpdateProduitEntity,
} from "../entity/stockEntity";
import { PaginatedResult, PaginationParams } from "../../../shared/pagination/pagination";

export interface StockRepository {
  createCategorie(boutiqueId: string, nom: string): Promise<CategorieEntity>;
  listCategories(
    boutiqueId: string,
    pagination: PaginationParams,
    filters: CategorieListFilter
  ): Promise<PaginatedResult<CategorieEntity>>;

  createProduit(boutiqueId: string, produit: CreateProduitEntity): Promise<ProduitEntity>;
  listProduits(
    boutiqueId: string,
    pagination: PaginationParams,
    filters: ProduitListFilter
  ): Promise<PaginatedResult<ProduitEntity>>;
  getProduitById(boutiqueId: string, produitId: string): Promise<ProduitEntity | null>;
  getProduitByCodeQR(boutiqueId: string, codeQR: string): Promise<ProduitEntity | null>;
  updateProduit(boutiqueId: string, produitId: string, produit: UpdateProduitEntity): Promise<ProduitEntity>;
  deleteProduit(boutiqueId: string, produitId: string): Promise<void>;

  createStockMovement(boutiqueId: string, movement: CreateStockMovementEntity): Promise<StockMovementEntity>;
  listStockMovements(
    boutiqueId: string,
    pagination: PaginationParams,
    filters: StockMovementListFilter
  ): Promise<PaginatedResult<StockMovementEntity>>;

  createRavitaillement(boutiqueId: string, ravitaillement: CreateRavitaillementEntity): Promise<unknown>;
  listRavitaillements(
    boutiqueId: string,
    pagination: PaginationParams,
    filters: RavitaillementListFilter
  ): Promise<PaginatedResult<unknown>>;
}
