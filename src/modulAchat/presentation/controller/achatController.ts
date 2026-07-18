import { MethodePaiement, StatutAchat, StatutDette } from "@prisma/client";
import { Response } from "express";
import { ZodError } from "zod";
import { optionalBoolean, optionalString, parseDateRange } from "../../../shared/filters/queryFilters";
import { parsePaginationQuery } from "../../../shared/pagination/pagination";
import { mapPrismaError } from "../../../shared/errorMessages/prismaErrorMapper";
import { AuthenticatedRequest } from "../../../shared/types/authTypes";
import { AchatUseCase } from "../../application/usecase/achatUsecase";
import { createAchatSchema, createFournisseurSchema, payDetteFournisseurSchema, updateFournisseurSchema } from "../validationZod/achatSchema";

export class AchatController {
  constructor(private readonly useCase: AchatUseCase) {}

  async createFournisseur(req: AuthenticatedRequest, res: Response) { await this.run(res, async () => ({ status: 201, data: await this.useCase.createFournisseur(this.boutiqueId(req), createFournisseurSchema.parse(req.body)) })); }
  async listFournisseurs(req: AuthenticatedRequest, res: Response) { await this.runList(res, () => this.useCase.listFournisseurs(this.boutiqueId(req), parsePaginationQuery(req.query), { search: optionalString(req.query.search), actif: optionalBoolean(req.query.actif) })); }
  async getFournisseur(req: AuthenticatedRequest, res: Response) { await this.run(res, async () => ({ data: await this.required(await this.useCase.getFournisseurById(this.boutiqueId(req), this.param(req, "id")), "Fournisseur non trouvé.") })); }
  async updateFournisseur(req: AuthenticatedRequest, res: Response) { await this.run(res, async () => ({ data: await this.useCase.updateFournisseur(this.boutiqueId(req), this.param(req, "id"), updateFournisseurSchema.parse(req.body)) })); }
  async deactivateFournisseur(req: AuthenticatedRequest, res: Response) { await this.run(res, async () => ({ data: await this.useCase.deactivateFournisseur(this.boutiqueId(req), this.param(req, "id")) })); }
  async createAchat(req: AuthenticatedRequest, res: Response) { await this.run(res, async () => ({ status: 201, data: await this.useCase.createAchat(this.boutiqueId(req), { ...createAchatSchema.parse(req.body), userId: this.userId(req) }) })); }
  async listAchats(req: AuthenticatedRequest, res: Response) { await this.runList(res, () => this.useCase.listAchats(this.boutiqueId(req), parsePaginationQuery(req.query), { ...parseDateRange(req.query), fournisseurId: optionalString(req.query.fournisseurId), statut: this.enumValue(StatutAchat, req.query.statut), search: optionalString(req.query.search) })); }
  async getAchat(req: AuthenticatedRequest, res: Response) { await this.run(res, async () => ({ data: await this.required(await this.useCase.getAchatById(this.boutiqueId(req), this.param(req, "id")), "Achat non trouvé.") })); }
  async listDettes(req: AuthenticatedRequest, res: Response) { await this.runList(res, () => this.useCase.listDettesFournisseurs(this.boutiqueId(req), parsePaginationQuery(req.query), { ...parseDateRange(req.query), fournisseurId: optionalString(req.query.fournisseurId), statut: this.enumValue(StatutDette, req.query.statut), search: optionalString(req.query.search) })); }
  async payDette(req: AuthenticatedRequest, res: Response) { await this.run(res, async () => ({ data: await this.useCase.payDetteFournisseur(this.boutiqueId(req), { ...payDetteFournisseurSchema.parse(req.body), detteFournisseurId: this.param(req, "id"), userId: this.userId(req) }) })); }

  private async runList(res: Response, action: () => Promise<any>) { await this.run(res, async () => { const result = await action(); return { data: result.data, pagination: result.pagination }; }); }
  private async run(res: Response, action: () => Promise<{ status?: number; data: unknown; pagination?: unknown }>) {
    try { const result = await action(); res.status(result.status ?? 200).json({ success: true, data: result.data, ...(result.pagination ? { pagination: result.pagination } : {}) }); }
    catch (error) { this.handleError(error, res); }
  }
  private boutiqueId(req: AuthenticatedRequest) { if (!req.user?.boutiqueId) throw new Error("Boutique non authentifiée."); return req.user.boutiqueId; }
  private userId(req: AuthenticatedRequest) { if (!req.user?.userId) throw new Error("Utilisateur non authentifié."); return req.user.userId; }
  private param(req: AuthenticatedRequest, name: string) { const value = req.params[name]; if (typeof value !== "string" || !value.trim()) throw new Error(`Paramètre ${name} invalide.`); return value; }
  private required<T>(value: T | null, message: string): T { if (!value) throw new Error(message); return value; }
  private enumValue<T extends Record<string, string>>(source: T, value: unknown): T[keyof T] | undefined { const raw = optionalString(value); return raw && Object.values(source).includes(raw) ? raw as T[keyof T] : undefined; }
  private handleError(error: unknown, res: Response) {
    if (error instanceof ZodError) { res.status(400).json({ success: false, message: "Erreur de validation", errors: error.issues.map((issue) => ({ path: issue.path, message: issue.message })) }); return; }
    const mapped = mapPrismaError(error); if (mapped) { res.status(mapped.statusCode).json({ success: false, message: mapped.message }); return; }
    const message = error instanceof Error ? error.message : "Erreur interne."; res.status(message.includes("introuvable") || message.includes("non trouvé") ? 404 : 400).json({ success: false, message });
  }
}
