import { MethodePaiement, Prisma, PrismaClient, StatutDette, StatutVente, TypeAction, TypeStock } from "@prisma/client";
import { CancelVenteEntity, ClientListFilter, CreateClientEntity, CreateVenteEntity, DetteListFilter, PayDetteEntity, RefundVenteEntity, VenteListFilter } from "../../domaine/entity/venteEntity";
import { VenteRepository } from "../../domaine/repository/venteRepository";
import { ensureDayNotClosed } from "../../../shared/business/dayClosureGuard";
import { getPaginationArgs, paginatedResult, PaginationParams } from "../../../shared/pagination/pagination";
import { buildDateRange } from "../../../shared/filters/queryFilters";

export class PrismaVenteRepository implements VenteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createClient(boutiqueId: string, client: CreateClientEntity) {
    await ensureDayNotClosed(this.prisma, boutiqueId);

    return this.prisma.client.create({
      data: {
        boutiqueId,
        nom: client.nom,
        telephone: client.telephone,
      },
    });
  }

  async listClients(boutiqueId: string, pagination: PaginationParams, filters: ClientListFilter) {
    const where: Prisma.ClientWhereInput = {
      boutiqueId,
      ...(filters.search ? {
        OR: [
          { nom: { contains: filters.search } },
          { telephone: { contains: filters.search } },
        ],
      } : {}),
    };
    const [clients, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        orderBy: { nom: "asc" },
        ...getPaginationArgs(pagination),
      }),
      this.prisma.client.count({ where }),
    ]);

    return paginatedResult(clients, total, pagination);
  }

  async createVente(boutiqueId: string, vente: CreateVenteEntity) {
    return this.prisma.$transaction(async (tx) => {
      await ensureDayNotClosed(tx, boutiqueId);

      if (vente.clientId) {
        await this.ensureClientInBoutique(tx, boutiqueId, vente.clientId);
      }

      const productIds = vente.lignes.map((ligne) => ligne.produitId);
      if (new Set(productIds).size !== productIds.length) {
        throw new Error("Un produit ne peut apparaître qu'une seule fois dans une vente.");
      }

      const produits = await tx.produit.findMany({
        where: {
          boutiqueId,
          produitId: { in: productIds },
        },
      });

      if (produits.length !== productIds.length) {
        throw new Error("Un ou plusieurs produits sont introuvables dans cette boutique.");
      }

      let montantTotal = new Prisma.Decimal(0);
      const lignesCalculees = vente.lignes.map((ligne) => {
        const produit = produits.find((item) => item.produitId === ligne.produitId);
        if (!produit) {
          throw new Error("Produit introuvable dans cette boutique.");
        }

        const quantite = new Prisma.Decimal(ligne.quantite);
        const stockActuel = new Prisma.Decimal(produit.stockActuel);
        const stockApres = stockActuel.minus(quantite);

        if (stockApres.isNegative()) {
          throw new Error(`Stock insuffisant pour le produit ${produit.nom}.`);
        }

        const prixUnitaire = new Prisma.Decimal(ligne.prixUnitaire ?? produit.prixVente);
        const sousTotal = prixUnitaire.mul(quantite);
        montantTotal = montantTotal.plus(sousTotal);

        return {
          produit,
          quantite,
          stockApres,
          prixAchat: new Prisma.Decimal(produit.prixAchat),
          prixUnitaire,
          sousTotal,
        };
      });

      const paiement = await this.resolvePaymentAmount(tx, boutiqueId, {
        principalAmount: vente.montantPaye,
        originalAmount: vente.montantPayeDevisePaiement,
        devisePaiement: vente.devisePaiement,
        defaultPrincipalAmount: montantTotal,
      });
      const montantPaye = paiement.montantPrincipal;
      if (montantPaye.isNegative() || montantPaye.gt(montantTotal)) {
        throw new Error("Le montant payé doit être compris entre 0 et le montant total.");
      }

      const resteAPayer = montantTotal.minus(montantPaye);
      const statut = this.resolveStatutVente(montantPaye, resteAPayer);
      const methodePaiement = vente.methodePaiement ?? MethodePaiement.ESPECES;

      if (!resteAPayer.isZero() && !vente.clientId) {
        throw new Error("Un client est obligatoire pour une vente à dette ou partiellement payée.");
      }

      const createdVente = await tx.vente.create({
        data: {
          numeroVente: this.generateNumeroVente(),
          boutiqueId,
          userId: vente.userId,
          clientId: vente.clientId,
          montantTotal,
          montantPaye,
          montantPayeDevisePaiement: paiement.montantDevisePaiement,
          devisePaiement: paiement.devisePaiement,
          resteAPayer,
          methodePaiement,
          statut,
          lignesVente: {
            create: lignesCalculees.map((ligne) => ({
              produitId: ligne.produit.produitId,
              quantite: ligne.quantite,
              prixAchat: ligne.prixAchat,
              prixUnitaire: ligne.prixUnitaire,
              sousTotal: ligne.sousTotal,
            })),
          },
        },
        include: {
          client: true,
          lignesVente: { include: { produit: true } },
          dette: true,
        },
      });

      for (const ligne of lignesCalculees) {
        await tx.produit.update({
          where: { produitId: ligne.produit.produitId },
          data: { stockActuel: ligne.stockApres },
        });

        await tx.stock.create({
          data: {
            produitId: ligne.produit.produitId,
            type: TypeStock.SORTIE,
            quantite: ligne.quantite,
            raison: `Vente ${createdVente.numeroVente}`,
          },
        });
      }

      if (!resteAPayer.isZero() && vente.clientId) {
        await tx.dette.create({
          data: {
            clientId: vente.clientId,
            venteId: createdVente.venteId,
            boutiqueId,
            montantTotal: resteAPayer,
            montantRestant: resteAPayer,
            statut: montantPaye.isZero() ? StatutDette.EN_COURS : StatutDette.PARTIELLE,
          },
        });
      }

      return tx.vente.findUnique({
        where: { venteId: createdVente.venteId },
        include: {
          client: true,
          lignesVente: { include: { produit: true } },
          dette: { include: { paiements: true } },
          remboursements: { include: { lignes: true } },
        },
      });
    });
  }

  async listVentes(boutiqueId: string, pagination: PaginationParams, filters: VenteListFilter) {
    const dateRange = buildDateRange(filters);
    const where: Prisma.VenteWhereInput = {
      boutiqueId,
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.statut ? { statut: filters.statut } : {}),
      ...(filters.methodePaiement ? { methodePaiement: filters.methodePaiement } : {}),
      ...(dateRange ? { createdAt: dateRange } : {}),
      ...(filters.search ? {
        OR: [
          { numeroVente: { contains: filters.search } },
          { client: { nom: { contains: filters.search } } },
          { client: { telephone: { contains: filters.search } } },
        ],
      } : {}),
    };
    const [ventes, total] = await this.prisma.$transaction([
      this.prisma.vente.findMany({
        where,
        include: {
          client: true,
          lignesVente: { include: { produit: true } },
          dette: true,
          remboursements: { include: { lignes: true } },
        },
        orderBy: { createdAt: "desc" },
        ...getPaginationArgs(pagination),
      }),
      this.prisma.vente.count({ where }),
    ]);

    return paginatedResult(ventes, total, pagination);
  }

  async getVenteById(boutiqueId: string, venteId: string) {
    return this.prisma.vente.findFirst({
      where: { boutiqueId, venteId },
      include: {
        client: true,
        lignesVente: { include: { produit: true } },
        dette: { include: { paiements: true } },
        remboursements: { include: { lignes: true } },
      },
    });
  }

  async cancelVente(boutiqueId: string, data: CancelVenteEntity) {
    return this.prisma.$transaction(async (tx) => {
      await ensureDayNotClosed(tx, boutiqueId);
      const vente = await tx.vente.findFirst({
        where: { boutiqueId, venteId: data.venteId },
        include: { lignesVente: true, remboursements: true, dette: true },
      });
      if (!vente) throw new Error("Vente introuvable dans cette boutique.");
      if (vente.statut === StatutVente.ANNULEE) throw new Error("Cette vente est déjà annulée.");
      if (vente.remboursements.length || vente.statut === StatutVente.REMBOURSEE || vente.statut === StatutVente.REMBOURSEE_PARTIELLEMENT) {
        throw new Error("Une vente déjà remboursée ne peut pas être annulée.");
      }

      for (const ligne of vente.lignesVente) {
        await tx.produit.update({ where: { produitId: ligne.produitId }, data: { stockActuel: { increment: ligne.quantite } } });
        await tx.stock.create({ data: {
          produitId: ligne.produitId,
          type: TypeStock.ENTREE,
          quantite: ligne.quantite,
          raison: `Annulation vente ${vente.numeroVente}: ${data.motif}`,
        } });
      }
      if (new Prisma.Decimal(vente.montantPaye).gt(0)) {
        await tx.remboursementVente.create({ data: {
          venteId: vente.venteId,
          boutiqueId,
          userId: data.userId,
          montant: vente.montantPaye,
          methode: vente.methodePaiement,
          motif: `Annulation: ${data.motif}`,
          lignes: { create: vente.lignesVente.map((ligne) => ({
            produitId: ligne.produitId,
            quantite: ligne.quantite,
            prixUnitaire: ligne.prixUnitaire,
            sousTotal: ligne.sousTotal,
          })) },
        } });
      }
      if (vente.dette) {
        await tx.dette.update({ where: { detteId: vente.dette.detteId }, data: { montantRestant: 0, statut: StatutDette.PAYEE } });
      }
      await tx.vente.update({ where: { venteId: vente.venteId }, data: {
        statut: StatutVente.ANNULEE,
        resteAPayer: 0,
        annuleeAt: new Date(),
        motifAnnulation: data.motif,
      } });
      await tx.journalAction.create({ data: { userId: data.userId, type: TypeAction.VENTE_ANNULATION, entite: "Vente", entiteId: vente.venteId } });
      return tx.vente.findUnique({ where: { venteId: vente.venteId }, include: { client: true, lignesVente: { include: { produit: true } }, dette: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async refundVente(boutiqueId: string, data: RefundVenteEntity) {
    return this.prisma.$transaction(async (tx) => {
      await ensureDayNotClosed(tx, boutiqueId);
      const vente = await tx.vente.findFirst({
        where: { boutiqueId, venteId: data.venteId },
        include: { lignesVente: true, remboursements: { include: { lignes: true } } },
      });
      if (!vente) throw new Error("Vente introuvable dans cette boutique.");
      if (vente.statut === StatutVente.ANNULEE) throw new Error("Une vente annulée ne peut pas être remboursée.");
      if (vente.statut !== StatutVente.PAYEE && vente.statut !== StatutVente.REMBOURSEE_PARTIELLEMENT) {
        throw new Error("Seules les ventes entièrement payées peuvent être remboursées.");
      }
      const productIds = data.lignes.map((ligne) => ligne.produitId);
      if (new Set(productIds).size !== productIds.length) throw new Error("Un produit ne peut apparaître qu'une fois dans un remboursement.");
      const dejaRembourse = new Map<string, Prisma.Decimal>();
      for (const remboursement of vente.remboursements) {
        for (const ligne of remboursement.lignes) {
          dejaRembourse.set(ligne.produitId, (dejaRembourse.get(ligne.produitId) ?? new Prisma.Decimal(0)).plus(ligne.quantite));
        }
      }
      const vendues = new Map<string, { quantite: Prisma.Decimal; prixUnitaire: Prisma.Decimal }>();
      for (const ligne of vente.lignesVente) {
        const current = vendues.get(ligne.produitId);
        vendues.set(ligne.produitId, {
          quantite: (current?.quantite ?? new Prisma.Decimal(0)).plus(ligne.quantite),
          prixUnitaire: current?.prixUnitaire ?? new Prisma.Decimal(ligne.prixUnitaire),
        });
      }
      let montant = new Prisma.Decimal(0);
      const lignes = data.lignes.map((input) => {
        const vendue = vendues.get(input.produitId);
        if (!vendue) throw new Error("Produit absent de la vente.");
        const quantite = new Prisma.Decimal(input.quantite);
        const disponible = vendue.quantite.minus(dejaRembourse.get(input.produitId) ?? 0);
        if (quantite.gt(disponible)) throw new Error("La quantité remboursée dépasse la quantité encore remboursable.");
        const sousTotal = vendue.prixUnitaire.mul(quantite);
        montant = montant.plus(sousTotal);
        return { produitId: input.produitId, quantite, prixUnitaire: vendue.prixUnitaire, sousTotal };
      });
      const remboursement = await tx.remboursementVente.create({ data: {
        venteId: vente.venteId,
        boutiqueId,
        userId: data.userId,
        montant,
        methode: data.methode,
        motif: data.motif,
        lignes: { create: lignes },
      } });
      for (const ligne of lignes) {
        await tx.produit.update({ where: { produitId: ligne.produitId }, data: { stockActuel: { increment: ligne.quantite } } });
        await tx.stock.create({ data: { produitId: ligne.produitId, type: TypeStock.ENTREE, quantite: ligne.quantite, raison: `Remboursement vente ${vente.numeroVente}` } });
        dejaRembourse.set(ligne.produitId, (dejaRembourse.get(ligne.produitId) ?? new Prisma.Decimal(0)).plus(ligne.quantite));
      }
      const totalRembourse = [...vendues.entries()].every(([produitId, vendue]) => (dejaRembourse.get(produitId) ?? new Prisma.Decimal(0)).gte(vendue.quantite));
      await tx.vente.update({ where: { venteId: vente.venteId }, data: { statut: totalRembourse ? StatutVente.REMBOURSEE : StatutVente.REMBOURSEE_PARTIELLEMENT } });
      await tx.journalAction.create({ data: { userId: data.userId, type: TypeAction.VENTE_REMBOURSEMENT, entite: "RemboursementVente", entiteId: remboursement.remboursementVenteId } });
      return tx.remboursementVente.findUnique({ where: { remboursementVenteId: remboursement.remboursementVenteId }, include: { lignes: { include: { produit: true } }, vente: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async getRecuVente(boutiqueId: string, venteId: string) {
    const vente = await this.prisma.vente.findFirst({
      where: { boutiqueId, venteId },
      include: {
        boutique: { select: { nom: true, adresse: true, RCCM: true, devise: true } },
        User: { select: { nom: true, nomUtilisateur: true } },
        client: true,
        lignesVente: { include: { produit: { select: { nom: true, uniteMesure: true } } } },
        dette: true,
        remboursements: { include: { lignes: true } },
      },
    });
    if (!vente) return null;
    const totalRembourse = vente.remboursements.reduce((sum, item) => sum.plus(item.montant), new Prisma.Decimal(0));
    const montantNet = vente.statut === StatutVente.ANNULEE
      ? new Prisma.Decimal(0)
      : new Prisma.Decimal(vente.montantTotal).minus(totalRembourse);
    return { type: "RECU_VENTE", vente, totalRembourse, montantNet };
  }

  async listDettes(boutiqueId: string, pagination: PaginationParams, filters: DetteListFilter) {
    const dateRange = buildDateRange(filters);
    const where: Prisma.DetteWhereInput = {
      boutiqueId,
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.statut ? { statut: filters.statut } : {}),
      ...(dateRange ? { createdAt: dateRange } : {}),
      ...(filters.search ? {
        OR: [
          { client: { nom: { contains: filters.search } } },
          { client: { telephone: { contains: filters.search } } },
          { vente: { numeroVente: { contains: filters.search } } },
        ],
      } : {}),
    };
    const [dettes, total] = await this.prisma.$transaction([
      this.prisma.dette.findMany({
        where,
        include: {
          client: true,
          vente: {
            include: {
              lignesVente: { include: { produit: true } },
            },
          },
          paiements: true,
        },
        orderBy: { createdAt: "desc" },
        ...getPaginationArgs(pagination),
      }),
      this.prisma.dette.count({ where }),
    ]);

    return paginatedResult(dettes, total, pagination);
  }

  async payDette(boutiqueId: string, paiement: PayDetteEntity) {
    return this.prisma.$transaction(async (tx) => {
      await ensureDayNotClosed(tx, boutiqueId);

      const dette = await tx.dette.findFirst({
        where: { detteId: paiement.detteId, boutiqueId },
      });

      if (!dette) {
        throw new Error("Dette introuvable dans cette boutique.");
      }

      if (dette.statut === StatutDette.PAYEE) {
        throw new Error("Cette dette est déjà payée.");
      }

      const conversion = await this.resolvePaymentAmount(tx, boutiqueId, {
        principalAmount: paiement.montant,
        originalAmount: paiement.montantDevisePaiement,
        devisePaiement: paiement.devisePaiement,
      });
      const montant = conversion.montantPrincipal;
      const montantRestant = new Prisma.Decimal(dette.montantRestant);

      if (montant.gt(montantRestant)) {
        throw new Error("Le paiement dépasse le montant restant de la dette.");
      }

      const nouveauRestant = montantRestant.minus(montant);
      const nouveauStatut = nouveauRestant.isZero() ? StatutDette.PAYEE : StatutDette.PARTIELLE;

      await tx.paiementDette.create({
        data: {
          detteId: dette.detteId,
          montant,
          montantDevisePaiement: conversion.montantDevisePaiement,
          devisePaiement: conversion.devisePaiement,
          methode: paiement.methode,
        },
      });

      await tx.dette.update({
        where: { detteId: dette.detteId },
        data: {
          montantRestant: nouveauRestant,
          statut: nouveauStatut,
        },
      });

      await tx.vente.update({
        where: { venteId: dette.venteId },
        data: {
          montantPaye: { increment: montant },
          resteAPayer: nouveauRestant,
          statut: nouveauRestant.isZero() ? StatutVente.PAYEE : StatutVente.PARTIELLE,
        },
      });

      return tx.dette.findUnique({
        where: { detteId: dette.detteId },
        include: {
          client: true,
          vente: {
            include: {
              lignesVente: { include: { produit: true } },
            },
          },
          paiements: true,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async ensureClientInBoutique(
    tx: Prisma.TransactionClient,
    boutiqueId: string,
    clientId: string
  ): Promise<void> {
    const client = await tx.client.findFirst({
      where: { clientId, boutiqueId },
      select: { clientId: true },
    });

    if (!client) {
      throw new Error("Client introuvable dans cette boutique.");
    }
  }

  private resolveStatutVente(montantPaye: Prisma.Decimal, resteAPayer: Prisma.Decimal): StatutVente {
    if (resteAPayer.isZero()) {
      return StatutVente.PAYEE;
    }

    if (montantPaye.isZero()) {
      return StatutVente.DETTE;
    }

    return StatutVente.PARTIELLE;
  }

  private async resolvePaymentAmount(
    tx: Prisma.TransactionClient,
    boutiqueId: string,
    input: {
      principalAmount?: number;
      originalAmount?: number;
      devisePaiement?: string;
      defaultPrincipalAmount?: Prisma.Decimal;
    }
  ): Promise<{ montantPrincipal: Prisma.Decimal; montantDevisePaiement: Prisma.Decimal; devisePaiement: string }> {
    const boutique = await tx.boutique.findUnique({
      where: { boutiqueId },
      select: { devise: true, deviseSecondaire: true, tauxDeviseSecondaire: true },
    });

    if (!boutique) {
      throw new Error("Boutique introuvable.");
    }

    const devisePrincipale = boutique.devise.toUpperCase();
    const devisePaiement = (input.devisePaiement || devisePrincipale).trim().toUpperCase();

    if (devisePaiement === devisePrincipale) {
      const montantPrincipal = new Prisma.Decimal(input.principalAmount ?? input.originalAmount ?? input.defaultPrincipalAmount ?? 0);
      return {
        montantPrincipal,
        montantDevisePaiement: new Prisma.Decimal(input.originalAmount ?? montantPrincipal),
        devisePaiement,
      };
    }

    const deviseSecondaire = boutique.deviseSecondaire?.toUpperCase();
    if (!deviseSecondaire || devisePaiement !== deviseSecondaire) {
      throw new Error("Cette devise de paiement n'est pas configuree pour la boutique.");
    }

    if (!boutique.tauxDeviseSecondaire || new Prisma.Decimal(boutique.tauxDeviseSecondaire).lte(0)) {
      throw new Error("Le taux de la devise secondaire doit etre configure avant l'encaissement.");
    }

    const taux = new Prisma.Decimal(boutique.tauxDeviseSecondaire);
    const montantDevisePaiement = new Prisma.Decimal(
      input.originalAmount ?? (input.principalAmount !== undefined ? new Prisma.Decimal(input.principalAmount).mul(taux) : 0)
    );

    return {
      montantPrincipal: montantDevisePaiement.div(taux),
      montantDevisePaiement,
      devisePaiement,
    };
  }

  private generateNumeroVente(): string {
    return `VTE-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
  }
}
