import { randomUUID } from "crypto";
import { Prisma, PrismaClient, TypeStock } from "@prisma/client";
import {
  CreateProduitEntity,
  CreateRavitaillementEntity,
  CreateStockMovementEntity,
  CategorieListFilter,
  ProduitEntity,
  ProduitListFilter,
  RavitaillementListFilter,
  UpdateProduitEntity,
  StockMovementListFilter,
} from "../../domaine/entity/stockEntity";
import { StockRepository } from "../../domaine/repository/stockRepository";
import { ensureDayNotClosed } from "../../../shared/business/dayClosureGuard";
import { getPaginationArgs, paginatedResult, PaginationParams } from "../../../shared/pagination/pagination";
import { buildDateRange } from "../../../shared/filters/queryFilters";

export class PrismaStockRepository implements StockRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createCategorie(boutiqueId: string, nom: string) {
    await ensureDayNotClosed(this.prisma, boutiqueId);

    return this.prisma.categorie.create({
      data: { boutiqueId, nom },
    });
  }

  async listCategories(boutiqueId: string, pagination: PaginationParams, filters: CategorieListFilter) {
    const where: Prisma.CategorieWhereInput = {
      boutiqueId,
      ...(filters.search ? { nom: { contains: filters.search } } : {}),
    };
    const [categories, total] = await this.prisma.$transaction([
      this.prisma.categorie.findMany({
        where,
        orderBy: { nom: "asc" },
        ...getPaginationArgs(pagination),
      }),
      this.prisma.categorie.count({ where }),
    ]);

    return paginatedResult(categories, total, pagination);
  }

  async createProduit(boutiqueId: string, produit: CreateProduitEntity): Promise<ProduitEntity> {
    await ensureDayNotClosed(this.prisma, boutiqueId);

    const created = await this.prisma.produit.create({
      data: {
        ...produit,
        boutiqueId,
        codeQR: produit.codeQR || this.generateCodeQR(),
        prixAchat: new Prisma.Decimal(produit.prixAchat),
        prixVente: new Prisma.Decimal(produit.prixVente),
        stockActuel: new Prisma.Decimal(produit.stockActuel ?? 0),
      },
    });

    return this.mapProduit(created);
  }

  async listProduits(boutiqueId: string, pagination: PaginationParams, filters: ProduitListFilter) {
    const where: Prisma.ProduitWhereInput = {
      boutiqueId,
      ...(filters.categorieId ? { categorieId: filters.categorieId } : {}),
      ...(filters.uniteMesure ? { uniteMesure: filters.uniteMesure } : {}),
      ...(filters.stockFaible ? { stockActuel: { lte: new Prisma.Decimal(5) } } : {}),
      ...(filters.search ? {
        OR: [
          { nom: { contains: filters.search } },
          { codeQR: { contains: filters.search } },
          { description: { contains: filters.search } },
        ],
      } : {}),
    };
    const [produits, total] = await this.prisma.$transaction([
      this.prisma.produit.findMany({
        where,
        orderBy: { nom: "asc" },
        ...getPaginationArgs(pagination),
      }),
      this.prisma.produit.count({ where }),
    ]);

    return paginatedResult(produits.map((produit) => this.mapProduit(produit)), total, pagination);
  }

  async getProduitById(boutiqueId: string, produitId: string): Promise<ProduitEntity | null> {
    const produit = await this.prisma.produit.findFirst({
      where: { produitId, boutiqueId },
    });

    return produit ? this.mapProduit(produit) : null;
  }

  async getProduitByCodeQR(boutiqueId: string, codeQR: string): Promise<ProduitEntity | null> {
    const produit = await this.prisma.produit.findFirst({
      where: { codeQR, boutiqueId },
    });

    return produit ? this.mapProduit(produit) : null;
  }

  async updateProduit(
    boutiqueId: string,
    produitId: string,
    produit: UpdateProduitEntity
  ): Promise<ProduitEntity> {
    await this.ensureProduitInBoutique(boutiqueId, produitId);
    await ensureDayNotClosed(this.prisma, boutiqueId);

    const updated = await this.prisma.produit.update({
      where: { produitId },
      data: {
        ...produit,
        prixAchat: produit.prixAchat !== undefined ? new Prisma.Decimal(produit.prixAchat) : undefined,
        prixVente: produit.prixVente !== undefined ? new Prisma.Decimal(produit.prixVente) : undefined,
      },
    });

    return this.mapProduit(updated);
  }

  async deleteProduit(boutiqueId: string, produitId: string): Promise<void> {
    await this.ensureProduitInBoutique(boutiqueId, produitId);
    await ensureDayNotClosed(this.prisma, boutiqueId);
    await this.prisma.produit.delete({ where: { produitId } });
  }

  async createStockMovement(boutiqueId: string, movement: CreateStockMovementEntity) {
    return this.prisma.$transaction(async (tx) => {
      await ensureDayNotClosed(tx, boutiqueId);

      const produit = await tx.produit.findFirst({
        where: { produitId: movement.produitId, boutiqueId },
      });

      if (!produit) {
        throw new Error("Produit introuvable dans cette boutique.");
      }

      const quantite = new Prisma.Decimal(movement.quantite);
      const stockActuel = new Prisma.Decimal(produit.stockActuel);
      const prochainStock = this.calculateNextStock(stockActuel, quantite, movement.type);

      if (prochainStock.isNegative()) {
        throw new Error("Le stock ne peut pas devenir négatif.");
      }

      const stock = await tx.stock.create({
        data: {
          produitId: movement.produitId,
          type: movement.type,
          quantite,
          raison: movement.raison,
        },
      });

      await tx.produit.update({
        where: { produitId: movement.produitId },
        data: { stockActuel: prochainStock },
      });

      return {
        stockId: stock.stockId,
        produitId: stock.produitId,
        type: stock.type,
        quantite: stock.quantite.toString(),
        raison: stock.raison,
        createdAt: stock.createdAt,
      };
    });
  }

  async listStockMovements(boutiqueId: string, pagination: PaginationParams, filters: StockMovementListFilter) {
    const dateRange = buildDateRange(filters);
    const where = {
        produitId: filters.produitId,
        type: filters.type,
        ...(dateRange ? { createdAt: dateRange } : {}),
        Products: { boutiqueId },
      };

    const [stocks, total] = await this.prisma.$transaction([
      this.prisma.stock.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...getPaginationArgs(pagination),
      }),
      this.prisma.stock.count({ where }),
    ]);

    return paginatedResult(stocks.map((stock) => ({
      stockId: stock.stockId,
      produitId: stock.produitId,
      type: stock.type,
      quantite: stock.quantite.toString(),
      raison: stock.raison,
      createdAt: stock.createdAt,
    })), total, pagination);
  }

  async createRavitaillement(boutiqueId: string, ravitaillement: CreateRavitaillementEntity) {
    return this.prisma.$transaction(async (tx) => {
      await ensureDayNotClosed(tx, boutiqueId);

      const produit = await tx.produit.findFirst({
        where: { produitId: ravitaillement.produitId, boutiqueId },
      });

      if (!produit) {
        throw new Error("Produit introuvable dans cette boutique.");
      }

      const quantite = new Prisma.Decimal(ravitaillement.quantite);
      const stockAvant = new Prisma.Decimal(produit.stockActuel);
      const stockApres = stockAvant.plus(quantite);
      const prixAchatUnitaire = ravitaillement.prixAchatUnitaire
        ? new Prisma.Decimal(ravitaillement.prixAchatUnitaire)
        : null;
      const coutTotal = prixAchatUnitaire ? prixAchatUnitaire.mul(quantite) : null;

      const stock = await tx.stock.create({
        data: {
          produitId: ravitaillement.produitId,
          type: TypeStock.ENTREE,
          quantite,
          raison: "Ravitaillement",
        },
      });

      await tx.produit.update({
        where: { produitId: ravitaillement.produitId },
        data: { stockActuel: stockApres },
      });

      return tx.ravitaillement.create({
        data: {
          boutiqueId,
          produitId: ravitaillement.produitId,
          userId: ravitaillement.userId,
          stockId: stock.stockId,
          quantite,
          stockAvant,
          stockApres,
          prixAchatUnitaire,
          coutTotal,
          fournisseur: ravitaillement.fournisseur,
          numeroReference: ravitaillement.numeroReference,
          notes: ravitaillement.notes,
        },
        include: {
          produit: { select: { produitId: true, nom: true, codeQR: true } },
          user: { select: { userId: true, nom: true } },
        },
      });
    });
  }

  async listRavitaillements(boutiqueId: string, pagination: PaginationParams, filters: RavitaillementListFilter) {
    const dateRange = buildDateRange(filters);
    const where: Prisma.RavitaillementWhereInput = {
      boutiqueId,
      produitId: filters.produitId,
      userId: filters.userId,
      ...(dateRange ? { createdAt: dateRange } : {}),
      ...(filters.search ? {
        OR: [
          { fournisseur: { contains: filters.search } },
          { numeroReference: { contains: filters.search } },
          { notes: { contains: filters.search } },
          { produit: { nom: { contains: filters.search } } },
          { user: { nom: { contains: filters.search } } },
        ],
      } : {}),
    };
    const [ravitaillements, total] = await this.prisma.$transaction([
      this.prisma.ravitaillement.findMany({
        where,
        include: {
          produit: { select: { produitId: true, nom: true, codeQR: true } },
          user: { select: { userId: true, nom: true } },
        },
        orderBy: { createdAt: "desc" },
        ...getPaginationArgs(pagination),
      }),
      this.prisma.ravitaillement.count({ where }),
    ]);

    return paginatedResult(ravitaillements, total, pagination);
  }

  private async ensureProduitInBoutique(boutiqueId: string, produitId: string): Promise<void> {
    const produit = await this.prisma.produit.findFirst({
      where: { produitId, boutiqueId },
      select: { produitId: true },
    });

    if (!produit) {
      throw new Error("Produit introuvable dans cette boutique.");
    }
  }

  private calculateNextStock(current: Prisma.Decimal, quantity: Prisma.Decimal, type: TypeStock): Prisma.Decimal {
    if (type === TypeStock.ENTREE) {
      return current.plus(quantity);
    }

    if (type === TypeStock.SORTIE) {
      return current.minus(quantity);
    }

    return quantity;
  }

  private generateCodeQR(): string {
    return randomUUID();
  }

  private mapProduit(produit: Prisma.ProduitGetPayload<object>): ProduitEntity {
    return {
      produitId: produit.produitId,
      nom: produit.nom,
      description: produit.description,
      photo: produit.photo,
      prixAchat: produit.prixAchat.toString(),
      prixVente: produit.prixVente.toString(),
      stockActuel: produit.stockActuel.toString(),
      dateExpiration: produit.dateExpiration,
      codeQR: produit.codeQR,
      boutiqueId: produit.boutiqueId,
      uniteMesure: produit.uniteMesure,
      categorieId: produit.categorieId,
      createdAt: produit.createdAt,
      updatedAt: produit.updatedAt,
    };
  }
}
