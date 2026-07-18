import { MethodePaiement, Prisma, PrismaClient, StatutDette, StatutVente } from "@prisma/client";
import { getDayBounds } from "../../../shared/business/dayClosureGuard";
import { DashboardQueryEntity } from "../../domaine/entity/dashboardEntity";
import { DashboardRepository } from "../../domaine/repository/dashboardRepository";
import { singleDayRange } from "../../../shared/filters/queryFilters";
import { calculateInitialPayment } from "../../../shared/business/financialCalculations";

export class PrismaDashboardRepository implements DashboardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getSummary(boutiqueId: string, query: DashboardQueryEntity) {
    const bounds = this.getSummaryBounds(query);
    const dayFilter = { gte: bounds.start, lt: bounds.end };

    const [
      ventesAggregate,
      ventesCount,
      ventesDuJour,
      depensesByMethod,
      paiementsDetteByMethod,
      paiementsDetteByCurrency,
      apportsAggregate,
      retraitsApportAggregate,
      dettesAggregate,
      dettesCount,
      produitsCount,
      lowStockProducts,
      recentSales,
      recentExpenses,
      latestClosure,
      topProductRows,
      remboursements,
    ] = await Promise.all([
      this.prisma.vente.aggregate({
        where: { boutiqueId, createdAt: dayFilter, statut: { not: StatutVente.ANNULEE } },
        _sum: { montantTotal: true, montantPaye: true, resteAPayer: true },
      }),
      this.prisma.vente.count({ where: { boutiqueId, createdAt: dayFilter, statut: { not: StatutVente.ANNULEE } } }),
      this.prisma.vente.findMany({
        where: { boutiqueId, createdAt: dayFilter, statut: { not: StatutVente.ANNULEE } },
        select: {
          methodePaiement: true,
          montantPaye: true,
          montantPayeDevisePaiement: true,
          devisePaiement: true,
          dette: { select: { paiements: { select: { montant: true } } } },
        },
      }),
      this.prisma.depense.groupBy({
        by: ["methodePaiement"],
        where: { boutiqueId, dateDepense: dayFilter },
        _sum: { montant: true },
      }),
      this.prisma.paiementDette.groupBy({
        by: ["methode"],
        where: { createdAt: dayFilter, dette: { boutiqueId } },
        _sum: { montant: true },
      }),
      this.prisma.paiementDette.groupBy({
        by: ["devisePaiement"],
        where: { createdAt: dayFilter, dette: { boutiqueId } },
        _sum: { montant: true, montantDevisePaiement: true },
      }),
      this.prisma.apport.aggregate({
        where: { boutiqueId, dateApport: dayFilter },
        _sum: { montant: true },
      }),
      this.prisma.retraitApport.aggregate({
        where: { boutiqueId, dateRetrait: dayFilter },
        _sum: { montant: true },
      }),
      this.prisma.dette.aggregate({
        where: { boutiqueId, statut: { not: StatutDette.PAYEE } },
        _sum: { montantRestant: true },
      }),
      this.prisma.dette.count({ where: { boutiqueId, statut: { not: StatutDette.PAYEE } } }),
      this.prisma.produit.count({ where: { boutiqueId } }),
      this.prisma.produit.findMany({
        where: { boutiqueId, stockActuel: { lte: new Prisma.Decimal(5) } },
        orderBy: { stockActuel: "asc" },
        take: 8,
        select: { produitId: true, nom: true, stockActuel: true, uniteMesure: true, prixVente: true },
      }),
      this.prisma.vente.findMany({
        where: { boutiqueId },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { client: true },
      }),
      this.prisma.depense.findMany({
        where: { boutiqueId },
        orderBy: { dateDepense: "desc" },
        take: 6,
        include: { user: { select: { userId: true, nom: true } } },
      }),
      this.prisma.clotureJournee.findUnique({
        where: {
          boutiqueId_dateJournee: {
            boutiqueId,
            dateJournee: bounds.dateJournee,
          },
        },
      }),
      this.prisma.ligneVente.groupBy({
        by: ["produitId"],
        where: { vente: { boutiqueId, createdAt: dayFilter, statut: { not: StatutVente.ANNULEE } } },
        _sum: { quantite: true, sousTotal: true },
      }),
      this.prisma.remboursementVente.findMany({
        where: { boutiqueId, createdAt: dayFilter, vente: { statut: { not: StatutVente.ANNULEE } } },
        select: { montant: true, methode: true, lignes: { select: { produitId: true, quantite: true, sousTotal: true } } },
      }),
    ]);

    const topProducts = new Map(topProductRows.map((row) => [row.produitId, {
      produitId: row.produitId,
      quantite: this.decimal(row._sum.quantite),
      montant: this.decimal(row._sum.sousTotal),
    }]));
    for (const remboursement of remboursements) {
      for (const ligne of remboursement.lignes) {
        const current = topProducts.get(ligne.produitId) ?? { produitId: ligne.produitId, quantite: new Prisma.Decimal(0), montant: new Prisma.Decimal(0) };
        current.quantite = current.quantite.minus(ligne.quantite);
        current.montant = current.montant.minus(ligne.sousTotal);
        topProducts.set(ligne.produitId, current);
      }
    }
    const productNames = await this.prisma.produit.findMany({
      where: { produitId: { in: [...topProducts.keys()] } },
      select: { produitId: true, nom: true },
    });

    const remboursementsParMethode = (methode: MethodePaiement) => remboursements
      .filter((item) => item.methode === methode)
      .reduce((total, item) => total.plus(item.montant), new Prisma.Decimal(0));
    const totalRemboursements = remboursements.reduce((total, item) => total.plus(item.montant), new Prisma.Decimal(0));
    const totalMontantPaye = ventesDuJour.reduce(
      (total, vente) => total.plus(calculateInitialPayment(vente.montantPaye, vente.dette?.paiements.map((paiement) => paiement.montant) ?? [])),
      new Prisma.Decimal(0)
    ).minus(totalRemboursements);
    const ventesEspeces = this.sumSalesByPayment(ventesDuJour, MethodePaiement.ESPECES).minus(remboursementsParMethode(MethodePaiement.ESPECES));
    const ventesMobileMoney = this.sumSalesByPayment(ventesDuJour, MethodePaiement.MOBILE_MONEY).minus(remboursementsParMethode(MethodePaiement.MOBILE_MONEY));
    const ventesBanque = this.sumSalesByPayment(ventesDuJour, MethodePaiement.BANQUE).minus(remboursementsParMethode(MethodePaiement.BANQUE));
    const depensesEspeces = this.sumByPayment(depensesByMethod, MethodePaiement.ESPECES);
    const depensesMobileMoney = this.sumByPayment(depensesByMethod, MethodePaiement.MOBILE_MONEY);
    const depensesBanque = this.sumByPayment(depensesByMethod, MethodePaiement.BANQUE);
    const paiementsEspeces = this.sumByDebtPayment(paiementsDetteByMethod, MethodePaiement.ESPECES);
    const paiementsMobileMoney = this.sumByDebtPayment(paiementsDetteByMethod, MethodePaiement.MOBILE_MONEY);
    const paiementsBanque = this.sumByDebtPayment(paiementsDetteByMethod, MethodePaiement.BANQUE);
    const totalDepenses = depensesEspeces.plus(depensesMobileMoney).plus(depensesBanque);
    const totalPaiementsDettes = paiementsEspeces.plus(paiementsMobileMoney).plus(paiementsBanque);
    const totalApports = this.decimal(apportsAggregate._sum.montant);
    const totalRetraitsApports = this.decimal(retraitsApportAggregate._sum.montant);
    const especesNettes = ventesEspeces.plus(paiementsEspeces).plus(totalApports).minus(depensesEspeces).minus(totalRetraitsApports);
    const comptesDevises = this.buildCurrencyAccounts(ventesDuJour, paiementsDetteByCurrency);

    return {
      dateJournee: bounds.dateJournee,
      cloturee: Boolean(latestClosure),
      cloture: latestClosure,
      indicateurs: {
        nombreVentes: ventesCount,
        totalVentes: this.decimal(ventesAggregate._sum.montantTotal).minus(totalRemboursements),
        totalMontantPaye,
        totalRemboursements,
        totalResteAPayer: this.decimal(ventesAggregate._sum.resteAPayer),
        totalDepenses,
        totalApports,
        totalRetraitsApports,
        totalPaiementsDettes,
        especesNettes,
        caisseAttendue: latestClosure?.montantAttenduCaisse ?? especesNettes,
        nombreDettesOuvertes: dettesCount,
        totalDettesOuvertes: this.decimal(dettesAggregate._sum.montantRestant),
        nombreProduits: produitsCount,
        nombreProduitsStockFaible: lowStockProducts.length,
      },
      repartitionPaiements: {
        especes: ventesEspeces.plus(paiementsEspeces),
        mobileMoney: ventesMobileMoney.plus(paiementsMobileMoney),
        banque: ventesBanque.plus(paiementsBanque),
      },
      repartitionDepenses: {
        especes: depensesEspeces,
        mobileMoney: depensesMobileMoney,
        banque: depensesBanque,
      },
      comptesDevises,
      produitsStockFaible: lowStockProducts,
      meilleursProduits: [...topProducts.values()]
        .filter((row) => !row.quantite.isZero() || !row.montant.isZero())
        .map((row) => ({
          ...row,
          nom: productNames.find((product) => product.produitId === row.produitId)?.nom || "Produit",
        }))
        .sort((a, b) => Number(b.montant) - Number(a.montant))
        .slice(0, 5),
      dernieresVentes: recentSales,
      dernieresDepenses: recentExpenses,
    };
  }

  private decimal(value: Prisma.Decimal | null | undefined): Prisma.Decimal {
    return new Prisma.Decimal(value ?? 0);
  }

  private getSummaryBounds(query: DashboardQueryEntity) {
    if (query.dateDebut || query.dateFin) {
      const fallback = singleDayRange(query.dateDebut ?? query.dateFin);
      const start = query.dateDebut ? singleDayRange(query.dateDebut).start : fallback.start;
      const end = query.dateFin ? singleDayRange(query.dateFin).end : fallback.end;

      return { dateJournee: start, start, end };
    }

    return getDayBounds(query.date);
  }

  private sumByPayment(
    rows: Array<{ methodePaiement: MethodePaiement; _sum: { montant: Prisma.Decimal | null } }>,
    methodePaiement: MethodePaiement
  ): Prisma.Decimal {
    return this.decimal(rows.find((row) => row.methodePaiement === methodePaiement)?._sum.montant);
  }

  private sumByDebtPayment(
    rows: Array<{ methode: MethodePaiement; _sum: { montant: Prisma.Decimal | null } }>,
    methode: MethodePaiement
  ): Prisma.Decimal {
    return this.decimal(rows.find((row) => row.methode === methode)?._sum.montant);
  }

  private sumSalesByPayment(
    rows: Array<{ methodePaiement: MethodePaiement; montantPaye: Prisma.Decimal; dette: { paiements: Array<{ montant: Prisma.Decimal }> } | null }>,
    methodePaiement: MethodePaiement
  ): Prisma.Decimal {
    return rows
      .filter((row) => row.methodePaiement === methodePaiement)
      .reduce((total, row) => total.plus(calculateInitialPayment(row.montantPaye, row.dette?.paiements.map((paiement) => paiement.montant) ?? [])), new Prisma.Decimal(0));
  }

  private buildCurrencyAccounts(
    ventes: Array<{ devisePaiement: string | null; montantPaye: Prisma.Decimal; montantPayeDevisePaiement: Prisma.Decimal | null; dette: { paiements: Array<{ montant: Prisma.Decimal }> } | null }>,
    paiements: Array<{ devisePaiement: string | null; _sum: { montant: Prisma.Decimal | null; montantDevisePaiement: Prisma.Decimal | null } }>
  ) {
    const map = new Map<string, { devise: string; encaisseDevise: Prisma.Decimal; equivalentPrincipal: Prisma.Decimal }>();

    for (const row of ventes) {
      const initialPayment = calculateInitialPayment(row.montantPaye, row.dette?.paiements.map((paiement) => paiement.montant) ?? []);
      this.addCurrencyAccount(map, row.devisePaiement, row.montantPayeDevisePaiement ?? initialPayment, initialPayment);
    }

    for (const row of paiements) {
      this.addCurrencyAccount(map, row.devisePaiement, row._sum.montantDevisePaiement, row._sum.montant);
    }

    return Array.from(map.values());
  }

  private addCurrencyAccount(
    map: Map<string, { devise: string; encaisseDevise: Prisma.Decimal; equivalentPrincipal: Prisma.Decimal }>,
    devise: string | null,
    encaisseDevise: Prisma.Decimal | null,
    equivalentPrincipal: Prisma.Decimal | null
  ) {
    const key = devise || "PRINCIPALE";
    const current = map.get(key) || {
      devise: key,
      encaisseDevise: new Prisma.Decimal(0),
      equivalentPrincipal: new Prisma.Decimal(0),
    };

    current.encaisseDevise = current.encaisseDevise.plus(this.decimal(encaisseDevise));
    current.equivalentPrincipal = current.equivalentPrincipal.plus(this.decimal(equivalentPrincipal));
    map.set(key, current);
  }
}
