import { Prisma, PrismaClient, StatutApport } from "@prisma/client";
import { ApportListFilter, CreateApportEntity, CreateRetraitApportEntity } from "../../domaine/entity/apportEntity";
import { ApportRepository } from "../../domaine/repository/apportRepository";
import { ensureDayNotClosed } from "../../../shared/business/dayClosureGuard";
import { buildDateRange } from "../../../shared/filters/queryFilters";
import { getPaginationArgs, paginatedResult, PaginationParams } from "../../../shared/pagination/pagination";

export class PrismaApportRepository implements ApportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createApport(boutiqueId: string, apport: CreateApportEntity) {
    await ensureDayNotClosed(this.prisma, boutiqueId, apport.dateApport);
    const montant = new Prisma.Decimal(apport.montant);

    return this.prisma.apport.create({
      data: {
        boutiqueId,
        userId: apport.userId,
        libelle: apport.libelle,
        montant,
        montantRestant: montant,
        methodePaiement: apport.methodePaiement,
        referencePaiement: apport.referencePaiement,
        notes: apport.notes,
        dateApport: apport.dateApport,
      },
      include: this.includeRelations(),
    });
  }

  async listApports(boutiqueId: string, pagination: PaginationParams, filters: ApportListFilter) {
    const dateRange = buildDateRange(filters);
    const where: Prisma.ApportWhereInput = {
      boutiqueId,
      statut: filters.statut,
      methodePaiement: filters.methodePaiement,
      userId: filters.userId,
      ...(dateRange ? { dateApport: dateRange } : {}),
      ...(filters.search ? {
        OR: [
          { libelle: { contains: filters.search } },
          { referencePaiement: { contains: filters.search } },
          { notes: { contains: filters.search } },
          { user: { nom: { contains: filters.search } } },
        ],
      } : {}),
    };

    const [apports, total] = await this.prisma.$transaction([
      this.prisma.apport.findMany({
        where,
        include: this.includeRelations(),
        orderBy: { dateApport: "desc" },
        ...getPaginationArgs(pagination),
      }),
      this.prisma.apport.count({ where }),
    ]);

    return paginatedResult(apports, total, pagination);
  }

  async getApportById(boutiqueId: string, apportId: string) {
    return this.prisma.apport.findFirst({
      where: { boutiqueId, apportId },
      include: this.includeRelations(),
    });
  }

  async createRetrait(boutiqueId: string, retrait: CreateRetraitApportEntity) {
    return this.prisma.$transaction(async (tx) => {
      await ensureDayNotClosed(tx, boutiqueId, retrait.dateRetrait);

      const apport = await tx.apport.findFirst({
        where: { boutiqueId, apportId: retrait.apportId },
      });

      if (!apport) {
        throw new Error("Apport introuvable dans cette boutique.");
      }

      if (apport.statut === StatutApport.RECUPERE) {
        throw new Error("Cet apport est deja entierement recupere.");
      }

      const montant = new Prisma.Decimal(retrait.montant);
      const montantRestant = new Prisma.Decimal(apport.montantRestant);

      if (montant.gt(montantRestant)) {
        throw new Error("Le retrait depasse le montant restant de l'apport.");
      }

      const nouveauRestant = montantRestant.minus(montant);
      const statut = nouveauRestant.isZero() ? StatutApport.RECUPERE : StatutApport.PARTIELLEMENT_RECUPERE;

      await tx.retraitApport.create({
        data: {
          apportId: apport.apportId,
          boutiqueId,
          userId: retrait.userId,
          montant,
          notes: retrait.notes,
          dateRetrait: retrait.dateRetrait,
        },
      });

      return tx.apport.update({
        where: { apportId: apport.apportId },
        data: { montantRestant: nouveauRestant, statut },
        include: this.includeRelations(),
      });
    });
  }

  private includeRelations() {
    return {
      user: { select: { userId: true, nom: true } },
      retraits: {
        include: { user: { select: { userId: true, nom: true } } },
        orderBy: { dateRetrait: "desc" as const },
      },
    };
  }
}
