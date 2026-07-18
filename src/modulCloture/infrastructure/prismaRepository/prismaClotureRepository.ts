import { MethodePaiement, Prisma, PrismaClient, StatutVente } from "@prisma/client";
import { ClotureListFilter, CreateClotureJourneeEntity, CloturePreviewEntity } from "../../domaine/entity/clotureEntity";
import { ClotureRepository } from "../../domaine/repository/clotureRepository";
import { getDayBounds } from "../../../shared/business/dayClosureGuard";
import { getPaginationArgs, paginatedResult, PaginationParams } from "../../../shared/pagination/pagination";
import { buildDateRange } from "../../../shared/filters/queryFilters";
import { calculateInitialPayment } from "../../../shared/business/financialCalculations";

type DayBounds = {
  dateJournee: Date;
  start: Date;
  end: Date;
};

type ClosureTotals = {
  dateJournee: Date;
  nombreVentes: number;
  totalVentes: Prisma.Decimal;
  totalMontantPaye: Prisma.Decimal;
  totalEncaisseDevisePrincipale: Prisma.Decimal;
  totalEncaisseDeviseSecondaire: Prisma.Decimal;
  totalResteAPayer: Prisma.Decimal;
  totalDettesCreees: Prisma.Decimal;
  totalPaiementsDettes: Prisma.Decimal;
  totalRavitaillements: Prisma.Decimal;
  totalDepenses: Prisma.Decimal;
  totalApports: Prisma.Decimal;
  totalRetraitsApports: Prisma.Decimal;
  montantEspeces: Prisma.Decimal;
  montantMobileMoney: Prisma.Decimal;
  montantBanque: Prisma.Decimal;
  fondCaisseOuverture: Prisma.Decimal;
  montantAttenduCaisse: Prisma.Decimal;
};

export class PrismaClotureRepository implements ClotureRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async previewClotureJournee(boutiqueId: string, data: CloturePreviewEntity) {
    return this.calculateTotals(boutiqueId, data);
  }

  async createClotureJournee(boutiqueId: string, userId: string, data: CreateClotureJourneeEntity) {
    return this.prisma.$transaction(async (tx) => {
      const totals = await this.calculateTotals(boutiqueId, data, tx);
      const montantReelCaisse = new Prisma.Decimal(data.montantReelCaisse);
      const ecartCaisse = montantReelCaisse.minus(totals.montantAttenduCaisse);

      const existing = await tx.clotureJournee.findUnique({
        where: {
          boutiqueId_dateJournee: {
            boutiqueId,
            dateJournee: totals.dateJournee,
          },
        },
      });

      if (existing) {
        throw new Error("Cette journee est deja cloturee pour cette boutique.");
      }

      return tx.clotureJournee.create({
        data: {
          boutiqueId,
          clotureeParId: userId,
          dateJournee: totals.dateJournee,
          nombreVentes: totals.nombreVentes,
          totalVentes: totals.totalVentes,
          totalMontantPaye: totals.totalMontantPaye,
          totalEncaisseDevisePrincipale: totals.totalEncaisseDevisePrincipale,
          totalEncaisseDeviseSecondaire: totals.totalEncaisseDeviseSecondaire,
          totalResteAPayer: totals.totalResteAPayer,
          totalDettesCreees: totals.totalDettesCreees,
          totalPaiementsDettes: totals.totalPaiementsDettes,
          totalRavitaillements: totals.totalRavitaillements,
          totalDepenses: totals.totalDepenses,
          totalApports: totals.totalApports,
          totalRetraitsApports: totals.totalRetraitsApports,
          montantEspeces: totals.montantEspeces,
          montantMobileMoney: totals.montantMobileMoney,
          montantBanque: totals.montantBanque,
          fondCaisseOuverture: totals.fondCaisseOuverture,
          montantAttenduCaisse: totals.montantAttenduCaisse,
          montantReelCaisse,
          ecartCaisse,
          notes: data.notes,
        },
        include: {
          clotureePar: { select: { userId: true, nom: true, telephone: true } },
          valideePar: { select: { userId: true, nom: true, telephone: true } },
        },
      });
    });
  }

  async listCloturesJournee(boutiqueId: string, pagination: PaginationParams, filters: ClotureListFilter) {
    const dateRange = buildDateRange(filters);
    const where: Prisma.ClotureJourneeWhereInput = {
      boutiqueId,
      ...(filters.statut ? { statut: filters.statut } : {}),
      ...(filters.userId ? { clotureeParId: filters.userId } : {}),
      ...(dateRange ? { dateJournee: dateRange } : {}),
    };
    const [clotures, total] = await this.prisma.$transaction([
      this.prisma.clotureJournee.findMany({
        where,
        include: {
          clotureePar: { select: { userId: true, nom: true, telephone: true } },
          valideePar: { select: { userId: true, nom: true, telephone: true } },
        },
        orderBy: { dateJournee: "desc" },
        ...getPaginationArgs(pagination),
      }),
      this.prisma.clotureJournee.count({ where }),
    ]);

    return paginatedResult(clotures, total, pagination);
  }

  async getClotureJourneeById(boutiqueId: string, clotureJourneeId: string) {
    return this.prisma.clotureJournee.findFirst({
      where: { boutiqueId, clotureJourneeId },
      include: {
        clotureePar: { select: { userId: true, nom: true, telephone: true } },
        valideePar: { select: { userId: true, nom: true, telephone: true } },
      },
    });
  }

  private async calculateTotals(
    boutiqueId: string,
    data: CloturePreviewEntity,
    client: Prisma.TransactionClient | PrismaClient = this.prisma
  ): Promise<ClosureTotals> {
    const bounds = this.getDayBounds(data.dateJournee);
    const fondCaisseOuverture = new Prisma.Decimal(data.fondCaisseOuverture ?? 0);
    const dayFilter = { gte: bounds.start, lt: bounds.end };

    const [
      ventesAggregate,
      nombreVentes,
      ventesDuJour,
      dettesAggregate,
      paiementsDette,
      paiementsDetteParDevise,
      ravitaillementsAggregate,
      depenses,
      apports,
      retraitsApport,
      achats,
      paiementsDetteFournisseur,
      remboursements,
      boutique,
    ] = await Promise.all([
      client.vente.aggregate({
        where: { boutiqueId, createdAt: dayFilter, statut: { not: StatutVente.ANNULEE } },
        _sum: { montantTotal: true, montantPaye: true, resteAPayer: true },
      }),
      client.vente.count({ where: { boutiqueId, createdAt: dayFilter, statut: { not: StatutVente.ANNULEE } } }),
      client.vente.findMany({
        where: { boutiqueId, createdAt: dayFilter, statut: { not: StatutVente.ANNULEE } },
        select: {
          methodePaiement: true,
          montantPaye: true,
          montantPayeDevisePaiement: true,
          devisePaiement: true,
          dette: { select: { paiements: { select: { montant: true } } } },
        },
      }),
      client.dette.aggregate({
        where: { boutiqueId, createdAt: dayFilter },
        _sum: { montantTotal: true },
      }),
      client.paiementDette.groupBy({
        by: ["methode"],
        where: { createdAt: dayFilter, dette: { boutiqueId } },
        _sum: { montant: true },
      }),
      client.paiementDette.groupBy({
        by: ["devisePaiement"],
        where: { createdAt: dayFilter, dette: { boutiqueId } },
        _sum: { montant: true, montantDevisePaiement: true },
      }),
      client.ravitaillement.aggregate({
        where: { boutiqueId, createdAt: dayFilter },
        _sum: { coutTotal: true },
      }),
      client.depense.groupBy({
        by: ["methodePaiement"],
        where: { boutiqueId, dateDepense: dayFilter },
        _sum: { montant: true },
      }),
      client.apport.groupBy({
        by: ["methodePaiement"],
        where: { boutiqueId, dateApport: dayFilter },
        _sum: { montant: true },
      }),
      client.retraitApport.findMany({
        where: { boutiqueId, dateRetrait: dayFilter },
        select: { montant: true, apport: { select: { methodePaiement: true } } },
      }),
      client.achat.findMany({
        where: { boutiqueId, createdAt: dayFilter },
        include: { detteFournisseur: { include: { paiements: true } } },
      }),
      client.paiementDetteFournisseur.groupBy({
        by: ["methode"],
        where: { createdAt: dayFilter, detteFournisseur: { boutiqueId } },
        _sum: { montant: true },
      }),
      client.remboursementVente.groupBy({
        by: ["methode"],
        where: { boutiqueId, createdAt: dayFilter, vente: { statut: { not: StatutVente.ANNULEE } } },
        _sum: { montant: true },
      }),
      client.boutique.findUnique({
        where: { boutiqueId },
        select: { devise: true, deviseSecondaire: true },
      }),
    ]);

    const totalRemboursements = remboursements.reduce((sum, row) => sum.plus(this.decimal(row._sum.montant)), new Prisma.Decimal(0));
    const totalPaiementsInitiaux = ventesDuJour.reduce(
      (total, vente) => total.plus(calculateInitialPayment(vente.montantPaye, vente.dette?.paiements.map((paiement) => paiement.montant) ?? [])),
      new Prisma.Decimal(0)
    );
    const remboursementsParMethode = (methode: MethodePaiement) => this.sumByMethode(remboursements, methode);
    const ventesEspeces = this.sumVentesByMethode(ventesDuJour, MethodePaiement.ESPECES).minus(remboursementsParMethode(MethodePaiement.ESPECES));
    const ventesMobileMoney = this.sumVentesByMethode(ventesDuJour, MethodePaiement.MOBILE_MONEY).minus(remboursementsParMethode(MethodePaiement.MOBILE_MONEY));
    const ventesBanque = this.sumVentesByMethode(ventesDuJour, MethodePaiement.BANQUE).minus(remboursementsParMethode(MethodePaiement.BANQUE));
    const paiementsEspeces = this.sumByMethode(paiementsDette, MethodePaiement.ESPECES);
    const paiementsMobileMoney = this.sumByMethode(paiementsDette, MethodePaiement.MOBILE_MONEY);
    const paiementsBanque = this.sumByMethode(paiementsDette, MethodePaiement.BANQUE);
    const depensesEspeces = this.sumByMethodePaiement(depenses, MethodePaiement.ESPECES);
    const depensesMobileMoney = this.sumByMethodePaiement(depenses, MethodePaiement.MOBILE_MONEY);
    const depensesBanque = this.sumByMethodePaiement(depenses, MethodePaiement.BANQUE);
    const achatsInitiaux = (methode: MethodePaiement) => achats
      .filter((achat) => achat.methodePaiement === methode)
      .reduce((sum, achat) => {
        return sum.plus(calculateInitialPayment(achat.montantPaye, (achat.detteFournisseur?.paiements ?? []).map((paiement) => paiement.montant)));
      }, new Prisma.Decimal(0));
    const paiementsFournisseurs = (methode: MethodePaiement) => this.sumByMethode(paiementsDetteFournisseur, methode);

    const montantEspeces = ventesEspeces.plus(paiementsEspeces).minus(depensesEspeces).minus(achatsInitiaux(MethodePaiement.ESPECES)).minus(paiementsFournisseurs(MethodePaiement.ESPECES));
    const montantMobileMoney = ventesMobileMoney.plus(paiementsMobileMoney).minus(depensesMobileMoney).minus(achatsInitiaux(MethodePaiement.MOBILE_MONEY)).minus(paiementsFournisseurs(MethodePaiement.MOBILE_MONEY));
    const montantBanque = ventesBanque.plus(paiementsBanque).minus(depensesBanque).minus(achatsInitiaux(MethodePaiement.BANQUE)).minus(paiementsFournisseurs(MethodePaiement.BANQUE));
    const totalPaiementsDettes = paiementsEspeces.plus(paiementsMobileMoney).plus(paiementsBanque);
    const totalMontantPaye = totalPaiementsInitiaux.minus(totalRemboursements);
    const totalDepenses = depensesEspeces.plus(depensesMobileMoney).plus(depensesBanque);
    const totalApports = apports.reduce((sum, row) => sum.plus(this.decimal(row._sum.montant)), new Prisma.Decimal(0));
    const apportsEspeces = this.sumByMethodePaiement(apports, MethodePaiement.ESPECES);
    const totalRetraitsApports = retraitsApport.reduce((sum, row) => sum.plus(row.montant), new Prisma.Decimal(0));
    const retraitsEspeces = retraitsApport.filter((row) => row.apport.methodePaiement === MethodePaiement.ESPECES).reduce((sum, row) => sum.plus(row.montant), new Prisma.Decimal(0));
    const montantAttenduCaisse = fondCaisseOuverture.plus(montantEspeces).plus(apportsEspeces).minus(retraitsEspeces);
    const totalEncaisseDevisePrincipale = this.sumCurrencyAccount(
      boutique?.devise,
      ventesDuJour,
      paiementsDetteParDevise
    );
    const totalEncaisseDeviseSecondaire = this.sumCurrencyAccount(
      boutique?.deviseSecondaire,
      ventesDuJour,
      paiementsDetteParDevise
    );

    return {
      dateJournee: bounds.dateJournee,
      nombreVentes,
      totalVentes: this.decimal(ventesAggregate._sum.montantTotal).minus(totalRemboursements),
      totalMontantPaye,
      totalEncaisseDevisePrincipale,
      totalEncaisseDeviseSecondaire,
      totalResteAPayer: this.decimal(ventesAggregate._sum.resteAPayer),
      totalDettesCreees: this.decimal(dettesAggregate._sum.montantTotal),
      totalPaiementsDettes,
      totalRavitaillements: this.decimal(ravitaillementsAggregate._sum.coutTotal),
      totalDepenses,
      totalApports,
      totalRetraitsApports,
      montantEspeces,
      montantMobileMoney,
      montantBanque,
      fondCaisseOuverture,
      montantAttenduCaisse,
    };
  }

  private getDayBounds(date?: Date): DayBounds {
    return getDayBounds(date);
  }

  private decimal(value: Prisma.Decimal | null | undefined): Prisma.Decimal {
    return new Prisma.Decimal(value ?? 0);
  }

  private sumByMethode(
    rows: Array<{ methode: MethodePaiement; _sum: { montant: Prisma.Decimal | null } }>,
    methode: MethodePaiement
  ): Prisma.Decimal {
    return this.decimal(rows.find((row) => row.methode === methode)?._sum.montant);
  }

  private sumByMethodePaiement(
    rows: Array<{ methodePaiement: MethodePaiement; _sum: { montant: Prisma.Decimal | null } }>,
    methodePaiement: MethodePaiement
  ): Prisma.Decimal {
    return this.decimal(rows.find((row) => row.methodePaiement === methodePaiement)?._sum.montant);
  }

  private sumVentesByMethode(
    rows: Array<{ methodePaiement: MethodePaiement; montantPaye: Prisma.Decimal; dette: { paiements: Array<{ montant: Prisma.Decimal }> } | null }>,
    methodePaiement: MethodePaiement
  ): Prisma.Decimal {
    return rows
      .filter((row) => row.methodePaiement === methodePaiement)
      .reduce((total, row) => total.plus(calculateInitialPayment(row.montantPaye, row.dette?.paiements.map((paiement) => paiement.montant) ?? [])), new Prisma.Decimal(0));
  }

  private sumCurrencyAccount(
    devise: string | null | undefined,
    ventes: Array<{ devisePaiement: string | null; montantPayeDevisePaiement: Prisma.Decimal | null }>,
    paiements: Array<{ devisePaiement: string | null; _sum: { montantDevisePaiement: Prisma.Decimal | null } }>
  ): Prisma.Decimal {
    if (!devise) {
      return new Prisma.Decimal(0);
    }

    const normalized = devise.toUpperCase();
    const ventesTotal = ventes
      .filter((row) => row.devisePaiement?.toUpperCase() === normalized)
      .reduce((sum, row) => sum.plus(this.decimal(row.montantPayeDevisePaiement)), new Prisma.Decimal(0));
    const paiementsTotal = paiements
      .filter((row) => row.devisePaiement?.toUpperCase() === normalized)
      .reduce((sum, row) => sum.plus(this.decimal(row._sum.montantDevisePaiement)), new Prisma.Decimal(0));

    return ventesTotal.plus(paiementsTotal);
  }
}
