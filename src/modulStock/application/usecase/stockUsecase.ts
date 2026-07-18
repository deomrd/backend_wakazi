import {
  CreateProduitEntity,
  CreateRavitaillementEntity,
  CreateStockMovementEntity,
  CategorieListFilter,
  ProduitListFilter,
  RavitaillementListFilter,
  StockMovementListFilter,
  UpdateProduitEntity,
} from "../../domaine/entity/stockEntity";
import { StockRepository } from "../../domaine/repository/stockRepository";
import { PaginationParams } from "../../../shared/pagination/pagination";

export class StockUseCase {
  constructor(private readonly stockRepository: StockRepository) {}

  createCategorie(boutiqueId: string, nom: string) {
    return this.stockRepository.createCategorie(boutiqueId, nom.trim());
  }

  listCategories(boutiqueId: string, pagination: PaginationParams, filters: CategorieListFilter) {
    return this.stockRepository.listCategories(boutiqueId, pagination, filters);
  }

  createProduit(boutiqueId: string, produit: CreateProduitEntity) {
    return this.stockRepository.createProduit(boutiqueId, produit);
  }

  listProduits(boutiqueId: string, pagination: PaginationParams, filters: ProduitListFilter) {
    return this.stockRepository.listProduits(boutiqueId, pagination, filters);
  }

  getProduitById(boutiqueId: string, produitId: string) {
    return this.stockRepository.getProduitById(boutiqueId, produitId);
  }

  getProduitByCodeQR(boutiqueId: string, codeQR: string) {
    return this.stockRepository.getProduitByCodeQR(boutiqueId, codeQR.trim());
  }

  updateProduit(boutiqueId: string, produitId: string, produit: UpdateProduitEntity) {
    return this.stockRepository.updateProduit(boutiqueId, produitId, produit);
  }

  deleteProduit(boutiqueId: string, produitId: string) {
    return this.stockRepository.deleteProduit(boutiqueId, produitId);
  }

  createStockMovement(boutiqueId: string, movement: CreateStockMovementEntity) {
    return this.stockRepository.createStockMovement(boutiqueId, movement);
  }

  listStockMovements(boutiqueId: string, pagination: PaginationParams, filters: StockMovementListFilter) {
    return this.stockRepository.listStockMovements(boutiqueId, pagination, filters);
  }

  createRavitaillement(boutiqueId: string, ravitaillement: CreateRavitaillementEntity) {
    return this.stockRepository.createRavitaillement(boutiqueId, ravitaillement);
  }

  listRavitaillements(boutiqueId: string, pagination: PaginationParams, filters: RavitaillementListFilter) {
    return this.stockRepository.listRavitaillements(boutiqueId, pagination, filters);
  }
}
