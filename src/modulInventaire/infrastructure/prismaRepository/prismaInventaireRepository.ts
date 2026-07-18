import { Prisma, PrismaClient, TypeAction, TypeStock } from "@prisma/client";
import { ensureDayNotClosed } from "../../../shared/business/dayClosureGuard";
import { buildDateRange } from "../../../shared/filters/queryFilters";
import { getPaginationArgs, paginatedResult, PaginationParams } from "../../../shared/pagination/pagination";
import { CreateInventaireEntity, InventaireListFilter } from "../../domaine/entity/inventaireEntity";
import { InventaireRepository } from "../../domaine/repository/inventaireRepository";

export class PrismaInventaireRepository implements InventaireRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(boutiqueId: string, data: CreateInventaireEntity) {
    return this.prisma.$transaction(async (tx) => {
      await ensureDayNotClosed(tx, boutiqueId);
      const productIds = data.lignes.map((ligne) => ligne.produitId);
      if (new Set(productIds).size !== productIds.length) throw new Error("Un produit ne peut apparaître qu'une seule fois dans l'inventaire.");
      const produits = await tx.produit.findMany({ where: { boutiqueId, produitId: { in: productIds } } });
      if (produits.length !== productIds.length) throw new Error("Un ou plusieurs produits sont introuvables dans cette boutique.");
      const reference = `INV-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
      const lignes = data.lignes.map((ligne) => {
        const produit = produits.find((item) => item.produitId === ligne.produitId)!;
        const quantiteTheorique = new Prisma.Decimal(produit.stockActuel);
        const quantiteComptee = new Prisma.Decimal(ligne.quantiteComptee);
        return { produitId: ligne.produitId, quantiteTheorique, quantiteComptee, ecart: quantiteComptee.minus(quantiteTheorique) };
      });
      const inventaire = await tx.inventaire.create({
        data: { reference, boutiqueId, userId: data.userId, notes: data.notes, lignes: { create: lignes } },
      });
      for (const ligne of lignes) {
        if (ligne.ecart.isZero()) continue;
        await tx.produit.update({ where: { produitId: ligne.produitId }, data: { stockActuel: ligne.quantiteComptee } });
        await tx.stock.create({ data: {
          produitId: ligne.produitId,
          type: TypeStock.AJUSTEMENT,
          quantite: ligne.ecart.abs(),
          raison: `Inventaire ${reference} (${ligne.ecart.isPositive() ? "+" : "-"}${ligne.ecart.abs().toString()})`,
        } });
      }
      await tx.journalAction.create({ data: { userId: data.userId, type: TypeAction.INVENTAIRE_CREATION, entite: "Inventaire", entiteId: inventaire.inventaireId } });
      return this.find(tx, boutiqueId, inventaire.inventaireId);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async list(boutiqueId: string, pagination: PaginationParams, filters: InventaireListFilter) {
    const dateRange = buildDateRange(filters);
    const where: Prisma.InventaireWhereInput = {
      boutiqueId,
      ...(dateRange ? { createdAt: dateRange } : {}),
      ...(filters.search ? { OR: [{ reference: { contains: filters.search } }, { notes: { contains: filters.search } }] } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventaire.findMany({ where, include: { user: { select: { userId: true, nom: true } }, lignes: { include: { produit: true } } }, orderBy: { createdAt: "desc" }, ...getPaginationArgs(pagination) }),
      this.prisma.inventaire.count({ where }),
    ]);
    return paginatedResult(data, total, pagination);
  }

  getById(boutiqueId: string, inventaireId: string) { return this.find(this.prisma, boutiqueId, inventaireId); }

  private find(client: PrismaClient | Prisma.TransactionClient, boutiqueId: string, inventaireId: string) {
    return client.inventaire.findFirst({ where: { boutiqueId, inventaireId }, include: { user: { select: { userId: true, nom: true } }, lignes: { include: { produit: true } } } });
  }
}
