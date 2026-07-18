import { Prisma, PrismaClient, StatutVente } from "@prisma/client";
import { calculateNetProfit } from "../../../shared/business/financialCalculations";
import { buildDateRange } from "../../../shared/filters/queryFilters";
import { RapportFinancierFilter } from "../../domaine/entity/rapportEntity";
import { RapportRepository } from "../../domaine/repository/rapportRepository";

export class PrismaRapportRepository implements RapportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getFinancialReport(boutiqueId: string, filters: RapportFinancierFilter) {
    const dateRange = buildDateRange(filters);
    const [boutique, ventes, remboursements, depenses, produits, dettesClients, dettesFournisseurs, achats] = await Promise.all([
      this.prisma.boutique.findUnique({ where: { boutiqueId }, select: { nom: true, devise: true } }),
      this.prisma.vente.findMany({
        where: { boutiqueId, statut: { not: StatutVente.ANNULEE }, ...(dateRange ? { createdAt: dateRange } : {}) },
        include: { lignesVente: { include: { produit: { select: { nom: true } } } } },
      }),
      this.prisma.remboursementVente.findMany({
        where: { boutiqueId, vente: { statut: { not: StatutVente.ANNULEE } }, ...(dateRange ? { createdAt: dateRange } : {}) },
        include: {
          lignes: { include: { produit: { select: { nom: true } } } },
          vente: { select: { lignesVente: { select: { produitId: true, prixAchat: true } } } },
        },
      }),
      this.prisma.depense.findMany({ where: { boutiqueId, ...(dateRange ? { dateDepense: dateRange } : {}) } }),
      this.prisma.produit.findMany({ where: { boutiqueId }, select: { produitId: true, nom: true, stockActuel: true, prixAchat: true, prixVente: true } }),
      this.prisma.dette.findMany({ where: { boutiqueId, montantRestant: { gt: 0 } }, select: { montantRestant: true } }),
      this.prisma.detteFournisseur.findMany({ where: { boutiqueId, montantRestant: { gt: 0 } }, select: { montantRestant: true } }),
      this.prisma.achat.findMany({ where: { boutiqueId, ...(dateRange ? { createdAt: dateRange } : {}) }, select: { montantTotal: true, montantPaye: true, resteAPayer: true } }),
    ]);
    if (!boutique) throw new Error("Boutique introuvable.");
    const sum = <T>(items: T[], getter: (item: T) => Prisma.Decimal.Value) => items.reduce((total, item) => total.plus(getter(item)), new Prisma.Decimal(0));
    const revenue = sum(ventes, (vente) => vente.montantTotal);
    const refunds = sum(remboursements, (item) => item.montant);
    let costOfGoods = new Prisma.Decimal(0);
    const productStats = new Map<string, { nom: string; quantite: Prisma.Decimal; chiffreAffaires: Prisma.Decimal }>();
    for (const vente of ventes) {
      for (const ligne of vente.lignesVente) {
        const quantity = new Prisma.Decimal(ligne.quantite);
        costOfGoods = costOfGoods.plus(new Prisma.Decimal(ligne.prixAchat).mul(quantity));
        const current = productStats.get(ligne.produitId) ?? { nom: ligne.produit.nom, quantite: new Prisma.Decimal(0), chiffreAffaires: new Prisma.Decimal(0) };
        current.quantite = current.quantite.plus(quantity);
        current.chiffreAffaires = current.chiffreAffaires.plus(ligne.sousTotal);
        productStats.set(ligne.produitId, current);
      }
    }
    for (const remboursement of remboursements) {
      const purchasePrices = new Map(remboursement.vente.lignesVente.map((ligne) => [ligne.produitId, new Prisma.Decimal(ligne.prixAchat)]));
      for (const ligne of remboursement.lignes) {
        const quantity = new Prisma.Decimal(ligne.quantite);
        const purchasePrice = purchasePrices.get(ligne.produitId) ?? new Prisma.Decimal(0);
        costOfGoods = costOfGoods.minus(purchasePrice.mul(quantity));
        const current = productStats.get(ligne.produitId) ?? { nom: ligne.produit.nom, quantite: new Prisma.Decimal(0), chiffreAffaires: new Prisma.Decimal(0) };
        current.quantite = current.quantite.minus(quantity);
        current.chiffreAffaires = current.chiffreAffaires.minus(ligne.sousTotal);
        productStats.set(ligne.produitId, current);
      }
    }
    const totalExpenses = sum(depenses, (item) => item.montant);
    const profit = calculateNetProfit({ revenue, refunds, costOfGoods, expenses: totalExpenses });
    const stockValue = sum(produits, (item) => new Prisma.Decimal(item.stockActuel).mul(item.prixAchat));
    const customerReceivables = sum(dettesClients, (item) => item.montantRestant);
    const supplierPayables = sum(dettesFournisseurs, (item) => item.montantRestant);
    const purchasesTotal = sum(achats, (item) => item.montantTotal);
    return {
      boutique,
      periode: { dateDebut: filters.dateDebut ?? null, dateFin: filters.dateFin ?? null },
      ventes: { nombre: ventes.length, chiffreAffairesBrut: revenue, remboursements: refunds, chiffreAffairesNet: profit.netRevenue },
      coutMarchandisesVendues: costOfGoods,
      margeBrute: profit.grossProfit,
      depenses: totalExpenses,
      beneficeNet: profit.netProfit,
      achats: { nombre: achats.length, total: purchasesTotal },
      creancesClients: customerReceivables,
      dettesFournisseurs: supplierPayables,
      stock: { nombreProduits: produits.length, valeurAchat: stockValue },
      meilleursProduits: [...productStats.values()].filter((item) => !item.quantite.isZero() || !item.chiffreAffaires.isZero()).sort((a, b) => b.chiffreAffaires.comparedTo(a.chiffreAffaires)).slice(0, 10),
    };
  }
}
