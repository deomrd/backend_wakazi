import {
  MethodePaiement,
  Prisma,
  PrismaClient,
  StatutAchat,
  StatutDette,
  TypeAction,
  TypeStock,
} from "@prisma/client";
import { buildDateRange } from "../../../shared/filters/queryFilters";
import { getPaginationArgs, paginatedResult, PaginationParams } from "../../../shared/pagination/pagination";
import { ensureDayNotClosed } from "../../../shared/business/dayClosureGuard";
import {
  AchatListFilter,
  CreateAchatEntity,
  CreateFournisseurEntity,
  DetteFournisseurListFilter,
  FournisseurListFilter,
  PayDetteFournisseurEntity,
  UpdateFournisseurEntity,
} from "../../domaine/entity/achatEntity";
import { AchatRepository } from "../../domaine/repository/achatRepository";

export class PrismaAchatRepository implements AchatRepository {
  constructor(private readonly prisma: PrismaClient) {}

  createFournisseur(boutiqueId: string, data: CreateFournisseurEntity) {
    return this.prisma.fournisseur.create({ data: { boutiqueId, ...data } });
  }

  async listFournisseurs(boutiqueId: string, pagination: PaginationParams, filters: FournisseurListFilter) {
    const where: Prisma.FournisseurWhereInput = {
      boutiqueId,
      ...(filters.actif !== undefined ? { statut: filters.actif } : {}),
      ...(filters.search ? { OR: [
        { nom: { contains: filters.search } },
        { telephone: { contains: filters.search } },
        { email: { contains: filters.search } },
      ] } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.fournisseur.findMany({
        where,
        include: { _count: { select: { achats: true, dettes: true } } },
        orderBy: { nom: "asc" },
        ...getPaginationArgs(pagination),
      }),
      this.prisma.fournisseur.count({ where }),
    ]);
    return paginatedResult(data, total, pagination);
  }

  getFournisseurById(boutiqueId: string, fournisseurId: string) {
    return this.prisma.fournisseur.findFirst({
      where: { boutiqueId, fournisseurId },
      include: { achats: { orderBy: { createdAt: "desc" }, take: 20 }, dettes: { orderBy: { createdAt: "desc" } } },
    });
  }

  async updateFournisseur(boutiqueId: string, fournisseurId: string, data: UpdateFournisseurEntity) {
    await this.requireFournisseur(this.prisma, boutiqueId, fournisseurId);
    return this.prisma.fournisseur.update({ where: { fournisseurId }, data });
  }

  async deactivateFournisseur(boutiqueId: string, fournisseurId: string) {
    await this.requireFournisseur(this.prisma, boutiqueId, fournisseurId);
    return this.prisma.fournisseur.update({ where: { fournisseurId }, data: { statut: false } });
  }

  async createAchat(boutiqueId: string, data: CreateAchatEntity) {
    return this.prisma.$transaction(async (tx) => {
      await ensureDayNotClosed(tx, boutiqueId);
      if (data.fournisseurId) await this.requireFournisseur(tx, boutiqueId, data.fournisseurId);

      const productIds = data.lignes.map((ligne) => ligne.produitId);
      if (new Set(productIds).size !== productIds.length) throw new Error("Un produit ne peut apparaître qu'une seule fois dans un achat.");
      const produits = await tx.produit.findMany({ where: { boutiqueId, produitId: { in: productIds } } });
      if (produits.length !== productIds.length) throw new Error("Un ou plusieurs produits sont introuvables dans cette boutique.");

      let montantTotal = new Prisma.Decimal(0);
      const lignes = data.lignes.map((ligne) => {
        const quantite = new Prisma.Decimal(ligne.quantite);
        const prixAchat = new Prisma.Decimal(ligne.prixAchat);
        const sousTotal = quantite.mul(prixAchat);
        montantTotal = montantTotal.plus(sousTotal);
        return { ...ligne, quantite, prixAchat, sousTotal };
      });
      const montantPaye = new Prisma.Decimal(data.montantPaye ?? 0);
      if (montantPaye.gt(montantTotal)) throw new Error("Le montant payé dépasse le total de l'achat.");
      const resteAPayer = montantTotal.minus(montantPaye);
      if (!resteAPayer.isZero() && !data.fournisseurId) throw new Error("Un fournisseur est obligatoire pour un achat à crédit.");
      const statut = resteAPayer.isZero() ? StatutAchat.PAYE : montantPaye.isZero() ? StatutAchat.DETTE : StatutAchat.PARTIEL;
      const numeroAchat = this.generateNumeroAchat();

      const achat = await tx.achat.create({
        data: {
          numeroAchat,
          boutiqueId,
          fournisseurId: data.fournisseurId,
          userId: data.userId,
          montantTotal,
          montantPaye,
          resteAPayer,
          methodePaiement: data.methodePaiement ?? MethodePaiement.ESPECES,
          statut,
          reference: data.reference,
          notes: data.notes,
          lignes: { create: lignes.map((ligne) => ({
            produitId: ligne.produitId,
            quantite: ligne.quantite,
            prixAchat: ligne.prixAchat,
            sousTotal: ligne.sousTotal,
          })) },
        },
      });

      for (const ligne of lignes) {
        await tx.produit.update({
          where: { produitId: ligne.produitId },
          data: { stockActuel: { increment: ligne.quantite }, prixAchat: ligne.prixAchat },
        });
        await tx.stock.create({ data: {
          produitId: ligne.produitId,
          type: TypeStock.ENTREE,
          quantite: ligne.quantite,
          raison: `Achat ${numeroAchat}`,
        } });
      }

      if (!resteAPayer.isZero() && data.fournisseurId) {
        await tx.detteFournisseur.create({ data: {
          boutiqueId,
          fournisseurId: data.fournisseurId,
          achatId: achat.achatId,
          montantTotal,
          montantRestant: resteAPayer,
          statut: montantPaye.isZero() ? StatutDette.EN_COURS : StatutDette.PARTIELLE,
          dateEcheance: data.dateEcheance,
        } });
      }
      await tx.journalAction.create({ data: { userId: data.userId, type: TypeAction.ACHAT_CREATION, entite: "Achat", entiteId: achat.achatId } });
      return this.findAchat(tx, boutiqueId, achat.achatId);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async listAchats(boutiqueId: string, pagination: PaginationParams, filters: AchatListFilter) {
    const dateRange = buildDateRange(filters);
    const where: Prisma.AchatWhereInput = {
      boutiqueId,
      ...(filters.fournisseurId ? { fournisseurId: filters.fournisseurId } : {}),
      ...(filters.statut ? { statut: filters.statut } : {}),
      ...(dateRange ? { createdAt: dateRange } : {}),
      ...(filters.search ? { OR: [
        { numeroAchat: { contains: filters.search } },
        { reference: { contains: filters.search } },
        { fournisseur: { nom: { contains: filters.search } } },
      ] } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.achat.findMany({ where, include: { fournisseur: true, lignes: { include: { produit: true } }, detteFournisseur: true }, orderBy: { createdAt: "desc" }, ...getPaginationArgs(pagination) }),
      this.prisma.achat.count({ where }),
    ]);
    return paginatedResult(data, total, pagination);
  }

  getAchatById(boutiqueId: string, achatId: string) {
    return this.findAchat(this.prisma, boutiqueId, achatId);
  }

  async listDettesFournisseurs(boutiqueId: string, pagination: PaginationParams, filters: DetteFournisseurListFilter) {
    const dateRange = buildDateRange(filters);
    const where: Prisma.DetteFournisseurWhereInput = {
      boutiqueId,
      ...(filters.fournisseurId ? { fournisseurId: filters.fournisseurId } : {}),
      ...(filters.statut ? { statut: filters.statut } : {}),
      ...(dateRange ? { createdAt: dateRange } : {}),
      ...(filters.search ? { OR: [
        { fournisseur: { nom: { contains: filters.search } } },
        { achat: { numeroAchat: { contains: filters.search } } },
      ] } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.detteFournisseur.findMany({ where, include: { fournisseur: true, achat: true, paiements: true }, orderBy: { createdAt: "desc" }, ...getPaginationArgs(pagination) }),
      this.prisma.detteFournisseur.count({ where }),
    ]);
    return paginatedResult(data, total, pagination);
  }

  async payDetteFournisseur(boutiqueId: string, data: PayDetteFournisseurEntity) {
    return this.prisma.$transaction(async (tx) => {
      await ensureDayNotClosed(tx, boutiqueId);
      const dette = await tx.detteFournisseur.findFirst({ where: { boutiqueId, detteFournisseurId: data.detteFournisseurId } });
      if (!dette) throw new Error("Dette fournisseur introuvable.");
      if (dette.statut === StatutDette.PAYEE) throw new Error("Cette dette fournisseur est déjà payée.");
      const montant = new Prisma.Decimal(data.montant);
      const montantRestant = new Prisma.Decimal(dette.montantRestant);
      if (montant.gt(montantRestant)) throw new Error("Le paiement dépasse le solde fournisseur restant.");
      const nouveauRestant = montantRestant.minus(montant);
      const statutDette = nouveauRestant.isZero() ? StatutDette.PAYEE : StatutDette.PARTIELLE;
      await tx.paiementDetteFournisseur.create({ data: {
        detteFournisseurId: dette.detteFournisseurId,
        montant,
        methode: data.methode,
        reference: data.reference,
      } });
      await tx.detteFournisseur.update({ where: { detteFournisseurId: dette.detteFournisseurId }, data: { montantRestant: nouveauRestant, statut: statutDette } });
      const achat = await tx.achat.findUniqueOrThrow({ where: { achatId: dette.achatId } });
      const nouveauMontantPaye = new Prisma.Decimal(achat.montantTotal).minus(nouveauRestant);
      await tx.achat.update({ where: { achatId: achat.achatId }, data: {
        montantPaye: nouveauMontantPaye,
        resteAPayer: nouveauRestant,
        statut: nouveauRestant.isZero() ? StatutAchat.PAYE : StatutAchat.PARTIEL,
      } });
      await tx.journalAction.create({ data: { userId: data.userId, type: TypeAction.PAIEMENT_DETTE, entite: "DetteFournisseur", entiteId: dette.detteFournisseurId } });
      return tx.detteFournisseur.findUnique({ where: { detteFournisseurId: dette.detteFournisseurId }, include: { fournisseur: true, achat: true, paiements: true } });
    });
  }

  private async requireFournisseur(client: PrismaClient | Prisma.TransactionClient, boutiqueId: string, fournisseurId: string) {
    const fournisseur = await client.fournisseur.findFirst({ where: { boutiqueId, fournisseurId, statut: true }, select: { fournisseurId: true } });
    if (!fournisseur) throw new Error("Fournisseur introuvable ou désactivé dans cette boutique.");
  }

  private findAchat(client: PrismaClient | Prisma.TransactionClient, boutiqueId: string, achatId: string) {
    return client.achat.findFirst({
      where: { boutiqueId, achatId },
      include: { fournisseur: true, user: { select: { userId: true, nom: true, nomUtilisateur: true } }, lignes: { include: { produit: true } }, detteFournisseur: { include: { paiements: true } } },
    });
  }

  private generateNumeroAchat() {
    return `ACH-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
  }
}
