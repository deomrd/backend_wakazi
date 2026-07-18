import { Prisma, PrismaClient, RoleNom } from "@prisma/client";
import { CreateDepenseEntity, DepenseActorEntity, DepenseListFilter, UpdateDepenseEntity } from "../../domaine/entity/depenseEntity";
import { DepenseRepository } from "../../domaine/repository/depenseRepository";
import { ensureDayNotClosed } from "../../../shared/business/dayClosureGuard";
import { getPaginationArgs, paginatedResult, PaginationParams } from "../../../shared/pagination/pagination";
import { buildDateRange } from "../../../shared/filters/queryFilters";

export class PrismaDepenseRepository implements DepenseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createDepense(boutiqueId: string, actor: DepenseActorEntity, depense: CreateDepenseEntity) {
    return this.prisma.$transaction(async (tx) => {
      await ensureDayNotClosed(tx, boutiqueId, depense.dateDepense);

      const montant = new Prisma.Decimal(depense.montant);

      if (actor.role === RoleNom.VENDEUR) {
        const disponible = await this.getVendeurDailyAvailable(tx, boutiqueId, actor.userId);

        if (disponible.lessThan(montant)) {
          throw new Error(
            `Depense refusee. Votre disponible du jour est ${disponible.toFixed(2)}; vous ne pouvez pas depenser ${montant.toFixed(2)}.`
          );
        }
      }

      return tx.depense.create({
        data: {
          boutiqueId,
          userId: actor.userId,
          categorie: depense.categorie,
          libelle: depense.libelle,
          montant,
          methodePaiement: depense.methodePaiement,
          referencePaiement: depense.referencePaiement,
          notes: depense.notes,
          dateDepense: depense.dateDepense,
        },
        include: {
          user: { select: { userId: true, nom: true } },
        },
      });
    });
  }

  async listDepenses(boutiqueId: string, actor: DepenseActorEntity, pagination: PaginationParams, filters: DepenseListFilter) {
    const dateRange = buildDateRange(filters);
    const where: Prisma.DepenseWhereInput = {
      ...this.scopeWhere(boutiqueId, actor),
      ...(filters.categorie ? { categorie: filters.categorie } : {}),
      ...(filters.methodePaiement ? { methodePaiement: filters.methodePaiement } : {}),
      ...(filters.userId && actor.role !== RoleNom.VENDEUR ? { userId: filters.userId } : {}),
      ...(dateRange ? { dateDepense: dateRange } : {}),
      ...(filters.search ? {
        OR: [
          { libelle: { contains: filters.search } },
          { referencePaiement: { contains: filters.search } },
          { notes: { contains: filters.search } },
          { user: { nom: { contains: filters.search } } },
        ],
      } : {}),
    };
    const [depenses, total] = await this.prisma.$transaction([
      this.prisma.depense.findMany({
        where,
        include: {
          user: { select: { userId: true, nom: true } },
        },
        orderBy: { dateDepense: "desc" },
        ...getPaginationArgs(pagination),
      }),
      this.prisma.depense.count({ where }),
    ]);

    return paginatedResult(depenses, total, pagination);
  }

  async getDepenseById(boutiqueId: string, actor: DepenseActorEntity, depenseId: string) {
    return this.prisma.depense.findFirst({
      where: { ...this.scopeWhere(boutiqueId, actor), depenseId },
      include: {
        user: { select: { userId: true, nom: true } },
      },
    });
  }

  async updateDepense(
    boutiqueId: string,
    actor: DepenseActorEntity,
    depenseId: string,
    depense: UpdateDepenseEntity
  ) {
    await this.ensureDepenseInScope(boutiqueId, actor, depenseId);
    await ensureDayNotClosed(this.prisma, boutiqueId, depense.dateDepense);

    if (actor.role === RoleNom.VENDEUR) {
      throw new Error("Un vendeur ne peut pas modifier une depense deja enregistree.");
    }

    return this.prisma.depense.update({
      where: { depenseId },
      data: {
        ...depense,
        montant: depense.montant !== undefined ? new Prisma.Decimal(depense.montant) : undefined,
      },
      include: {
        user: { select: { userId: true, nom: true } },
      },
    });
  }

  async deleteDepense(boutiqueId: string, actor: DepenseActorEntity, depenseId: string): Promise<void> {
    await this.ensureDepenseInScope(boutiqueId, actor, depenseId);
    await ensureDayNotClosed(this.prisma, boutiqueId);

    if (actor.role === RoleNom.VENDEUR) {
      throw new Error("Un vendeur ne peut pas supprimer une depense deja enregistree.");
    }

    await this.prisma.depense.delete({ where: { depenseId } });
  }

  private async ensureDepenseInScope(
    boutiqueId: string,
    actor: DepenseActorEntity,
    depenseId: string
  ): Promise<void> {
    const depense = await this.prisma.depense.findFirst({
      where: { ...this.scopeWhere(boutiqueId, actor), depenseId },
      select: { depenseId: true },
    });

    if (!depense) {
      throw new Error("Depense introuvable dans cette boutique.");
    }
  }

  private scopeWhere(boutiqueId: string, actor: DepenseActorEntity): Prisma.DepenseWhereInput {
    return actor.role === RoleNom.VENDEUR ? { boutiqueId, userId: actor.userId } : { boutiqueId };
  }

  private async getVendeurDailyAvailable(
    tx: Prisma.TransactionClient,
    boutiqueId: string,
    userId: string
  ): Promise<Prisma.Decimal> {
    const { start, end } = this.getTodayBounds();

    const ventes = await tx.vente.aggregate({
      where: {
        boutiqueId,
        userId,
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      _sum: {
        montantPaye: true,
      },
    });

    const depenses = await tx.depense.aggregate({
      where: {
        boutiqueId,
        userId,
        dateDepense: {
          gte: start,
          lt: end,
        },
      },
      _sum: {
        montant: true,
      },
    });

    const totalVendu = new Prisma.Decimal(ventes._sum.montantPaye || 0);
    const totalDepense = new Prisma.Decimal(depenses._sum.montant || 0);

    return totalVendu.minus(totalDepense);
  }

  private getTodayBounds(): { start: Date; end: Date } {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return { start, end };
  }
}
