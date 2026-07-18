import { MethodePaiement, Prisma, PrismaClient, StatutSessionCaisse, TypeAction, TypeMouvementCaisse } from "@prisma/client";
import { ensureDayNotClosed } from "../../../shared/business/dayClosureGuard";
import { calculateExpectedCash, calculateInitialPayment } from "../../../shared/business/financialCalculations";
import { buildDateRange } from "../../../shared/filters/queryFilters";
import { getPaginationArgs, paginatedResult, PaginationParams } from "../../../shared/pagination/pagination";
import { CloseSessionEntity, CreateMouvementEntity, OpenSessionEntity, SessionListFilter, ValidateSessionEntity } from "../../domaine/entity/caisseEntity";
import { CaisseRepository } from "../../domaine/repository/caisseRepository";

export class PrismaCaisseRepository implements CaisseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  createCaisse(boutiqueId: string, nom: string) { return this.prisma.caisse.create({ data: { boutiqueId, nom } }); }
  listCaisses(boutiqueId: string) { return this.prisma.caisse.findMany({ where: { boutiqueId }, include: { sessions: { where: { statut: StatutSessionCaisse.OUVERTE }, take: 1 } }, orderBy: { nom: "asc" } }); }

  async openSession(boutiqueId: string, data: OpenSessionEntity) {
    return this.prisma.$transaction(async (tx) => {
      await ensureDayNotClosed(tx, boutiqueId);
      const caisse = await tx.caisse.findFirst({ where: { boutiqueId, caisseId: data.caisseId, active: true } });
      if (!caisse) throw new Error("Caisse introuvable ou désactivée.");
      const existing = await tx.sessionCaisse.findFirst({ where: { caisse: { boutiqueId }, statut: StatutSessionCaisse.OUVERTE } });
      if (existing) throw new Error("La boutique possède déjà une session de caisse ouverte.");
      const session = await tx.sessionCaisse.create({ data: { caisseId: data.caisseId, ouverteParId: data.userId, fondOuverture: data.fondOuverture, notesOuverture: data.notesOuverture } });
      await tx.journalAction.create({ data: { userId: data.userId, type: TypeAction.CAISSE_OUVERTURE, entite: "SessionCaisse", entiteId: session.sessionCaisseId } });
      return session;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  getOpenSession(boutiqueId: string, caisseId?: string) {
    return this.prisma.sessionCaisse.findFirst({
      where: { caisse: { boutiqueId }, statut: StatutSessionCaisse.OUVERTE, ...(caisseId ? { caisseId } : {}) },
      include: { caisse: true, ouvertePar: { select: { userId: true, nom: true } }, mouvements: { orderBy: { createdAt: "desc" } } },
      orderBy: { ouverteAt: "desc" },
    });
  }

  async createMouvement(boutiqueId: string, data: CreateMouvementEntity) {
    return this.prisma.$transaction(async (tx) => {
      await ensureDayNotClosed(tx, boutiqueId);
      await this.requireOpenSession(tx, boutiqueId, data.sessionCaisseId);
      return tx.mouvementCaisse.create({ data });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async previewSession(boutiqueId: string, sessionCaisseId: string) {
    const session = await this.requireOpenSession(this.prisma, boutiqueId, sessionCaisseId);
    const details = await this.calculate(this.prisma, boutiqueId, session.ouverteAt, new Date(), session.fondOuverture, sessionCaisseId);
    return { session, ...details };
  }

  async closeSession(boutiqueId: string, data: CloseSessionEntity) {
    return this.prisma.$transaction(async (tx) => {
      await ensureDayNotClosed(tx, boutiqueId);
      const session = await this.requireOpenSession(tx, boutiqueId, data.sessionCaisseId);
      const closedAt = new Date();
      const details = await this.calculate(tx, boutiqueId, session.ouverteAt, closedAt, session.fondOuverture, session.sessionCaisseId);
      const montantReel = new Prisma.Decimal(data.montantReel);
      const updated = await tx.sessionCaisse.update({ where: { sessionCaisseId: session.sessionCaisseId }, data: {
        fermeeParId: data.userId,
        montantAttendu: details.montantAttendu,
        montantReel,
        ecart: montantReel.minus(details.montantAttendu),
        notesFermeture: data.notesFermeture,
        statut: StatutSessionCaisse.FERMEE,
        fermeeAt: closedAt,
      } });
      await tx.journalAction.create({ data: { userId: data.userId, type: TypeAction.CAISSE_FERMETURE, entite: "SessionCaisse", entiteId: session.sessionCaisseId } });
      return { ...updated, details: details.details };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async validateSession(boutiqueId: string, data: ValidateSessionEntity) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.sessionCaisse.findFirst({ where: { sessionCaisseId: data.sessionCaisseId, caisse: { boutiqueId }, statut: StatutSessionCaisse.FERMEE } });
      if (!session) throw new Error("Session fermée introuvable ou déjà validée.");
      return tx.sessionCaisse.update({ where: { sessionCaisseId: session.sessionCaisseId }, data: {
        statut: data.approuve ? StatutSessionCaisse.VALIDEE : StatutSessionCaisse.REJETEE,
        valideeParId: data.userId,
        valideeAt: new Date(),
      } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async listSessions(boutiqueId: string, pagination: PaginationParams, filters: SessionListFilter) {
    const dateRange = buildDateRange(filters);
    const where: Prisma.SessionCaisseWhereInput = { caisse: { boutiqueId }, ...(filters.caisseId ? { caisseId: filters.caisseId } : {}), ...(filters.statut ? { statut: filters.statut } : {}), ...(dateRange ? { ouverteAt: dateRange } : {}) };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.sessionCaisse.findMany({ where, include: { caisse: true, ouvertePar: { select: { nom: true } }, fermeePar: { select: { nom: true } }, valideePar: { select: { nom: true } }, mouvements: true }, orderBy: { ouverteAt: "desc" }, ...getPaginationArgs(pagination) }),
      this.prisma.sessionCaisse.count({ where }),
    ]);
    return paginatedResult(data, total, pagination);
  }

  private async calculate(client: PrismaClient | Prisma.TransactionClient, boutiqueId: string, start: Date, end: Date, opening: Prisma.Decimal.Value, sessionCaisseId: string) {
    const range = { gte: start, lte: end };
    const [sales, customerDebtPayments, contributions, expenses, purchases, supplierDebtPayments, withdrawals, refunds, movements] = await Promise.all([
      client.vente.findMany({ where: { boutiqueId, createdAt: range, methodePaiement: MethodePaiement.ESPECES }, include: { dette: { include: { paiements: true } } } }),
      client.paiementDette.findMany({ where: { methode: MethodePaiement.ESPECES, createdAt: range, dette: { boutiqueId } } }),
      client.apport.findMany({ where: { boutiqueId, methodePaiement: MethodePaiement.ESPECES, dateApport: range } }),
      client.depense.findMany({ where: { boutiqueId, methodePaiement: MethodePaiement.ESPECES, dateDepense: range } }),
      client.achat.findMany({ where: { boutiqueId, createdAt: range, methodePaiement: MethodePaiement.ESPECES }, include: { detteFournisseur: { include: { paiements: true } } } }),
      client.paiementDetteFournisseur.findMany({ where: { methode: MethodePaiement.ESPECES, createdAt: range, detteFournisseur: { boutiqueId } } }),
      client.retraitApport.findMany({ where: { boutiqueId, dateRetrait: range, apport: { methodePaiement: MethodePaiement.ESPECES } } }),
      client.remboursementVente.findMany({ where: { boutiqueId, methode: MethodePaiement.ESPECES, createdAt: range } }),
      client.mouvementCaisse.findMany({ where: { sessionCaisseId, createdAt: range } }),
    ]);
    const sum = <T>(items: T[], getter: (item: T) => Prisma.Decimal.Value) => items.reduce((total, item) => total.plus(getter(item)), new Prisma.Decimal(0));
    const saleInitial = sum(sales, (sale) => calculateInitialPayment(sale.montantPaye, (sale.dette?.paiements ?? []).map((p) => p.montant)));
    const purchaseInitial = sum(purchases, (purchase) => calculateInitialPayment(purchase.montantPaye, (purchase.detteFournisseur?.paiements ?? []).map((p) => p.montant)));
    const details = {
      ventes: saleInitial,
      paiementsDettesClients: sum(customerDebtPayments, (p) => p.montant),
      apports: sum(contributions, (p) => p.montant),
      depenses: sum(expenses, (p) => p.montant),
      achats: purchaseInitial,
      paiementsDettesFournisseurs: sum(supplierDebtPayments, (p) => p.montant),
      retraitsApports: sum(withdrawals, (p) => p.montant),
      remboursements: sum(refunds, (p) => p.montant),
      entreesManuelles: sum(movements.filter((m) => m.type === TypeMouvementCaisse.ENTREE), (m) => m.montant),
      sortiesManuelles: sum(movements.filter((m) => m.type === TypeMouvementCaisse.SORTIE), (m) => m.montant),
    };
    const montantAttendu = calculateExpectedCash({ opening, sales: details.ventes, customerDebtPayments: details.paiementsDettesClients, contributions: details.apports, manualIn: details.entreesManuelles, expenses: details.depenses, purchases: details.achats, supplierDebtPayments: details.paiementsDettesFournisseurs, contributionWithdrawals: details.retraitsApports, refunds: details.remboursements, manualOut: details.sortiesManuelles });
    return { montantAttendu, details };
  }

  private async requireOpenSession(client: PrismaClient | Prisma.TransactionClient, boutiqueId: string, sessionCaisseId: string) {
    const session = await client.sessionCaisse.findFirst({ where: { sessionCaisseId, statut: StatutSessionCaisse.OUVERTE, caisse: { boutiqueId } }, include: { caisse: true } });
    if (!session) throw new Error("Session de caisse ouverte introuvable.");
    return session;
  }
}
