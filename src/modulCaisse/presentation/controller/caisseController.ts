import { StatutSessionCaisse } from "@prisma/client";
import { Response } from "express";
import { ZodError } from "zod";
import { optionalString, parseDateRange } from "../../../shared/filters/queryFilters";
import { parsePaginationQuery } from "../../../shared/pagination/pagination";
import { AuthenticatedRequest } from "../../../shared/types/authTypes";
import { CaisseUseCase } from "../../application/usecase/caisseUsecase";
import { closeSessionSchema, createCaisseSchema, mouvementSchema, openSessionSchema, validateSessionSchema } from "../validationZod/caisseSchema";

export class CaisseController {
  constructor(private readonly useCase: CaisseUseCase) {}
  async createCaisse(req: AuthenticatedRequest, res: Response) { await this.run(res, async () => ({ status: 201, data: await this.useCase.createCaisse(this.shop(req), createCaisseSchema.parse(req.body).nom) })); }
  async listCaisses(req: AuthenticatedRequest, res: Response) { await this.run(res, async () => ({ data: await this.useCase.listCaisses(this.shop(req)) })); }
  async open(req: AuthenticatedRequest, res: Response) { await this.run(res, async () => ({ status: 201, data: await this.useCase.openSession(this.shop(req), { ...openSessionSchema.parse(req.body), userId: this.user(req) }) })); }
  async current(req: AuthenticatedRequest, res: Response) { await this.run(res, async () => ({ data: await this.useCase.getOpenSession(this.shop(req), optionalString(req.query.caisseId)) })); }
  async movement(req: AuthenticatedRequest, res: Response) { await this.run(res, async () => ({ status: 201, data: await this.useCase.createMouvement(this.shop(req), { ...mouvementSchema.parse(req.body), sessionCaisseId: this.param(req, "id"), userId: this.user(req) }) })); }
  async preview(req: AuthenticatedRequest, res: Response) { await this.run(res, async () => ({ data: await this.useCase.previewSession(this.shop(req), this.param(req, "id")) })); }
  async close(req: AuthenticatedRequest, res: Response) { await this.run(res, async () => ({ data: await this.useCase.closeSession(this.shop(req), { ...closeSessionSchema.parse(req.body), sessionCaisseId: this.param(req, "id"), userId: this.user(req) }) })); }
  async validate(req: AuthenticatedRequest, res: Response) { await this.run(res, async () => ({ data: await this.useCase.validateSession(this.shop(req), { ...validateSessionSchema.parse(req.body), sessionCaisseId: this.param(req, "id"), userId: this.user(req) }) })); }
  async listSessions(req: AuthenticatedRequest, res: Response) { await this.run(res, async () => { const result = await this.useCase.listSessions(this.shop(req), parsePaginationQuery(req.query), { ...parseDateRange(req.query), caisseId: optionalString(req.query.caisseId), statut: this.enumValue(StatutSessionCaisse, req.query.statut) }); return { data: result.data, pagination: result.pagination }; }); }
  private async run(res: Response, action: () => Promise<{ status?: number; data: unknown; pagination?: unknown }>) { try { const result = await action(); res.status(result.status ?? 200).json({ success: true, data: result.data, ...(result.pagination ? { pagination: result.pagination } : {}) }); } catch (error) { this.error(error, res); } }
  private shop(req: AuthenticatedRequest) { if (!req.user?.boutiqueId) throw new Error("Boutique non authentifiée."); return req.user.boutiqueId; }
  private user(req: AuthenticatedRequest) { if (!req.user?.userId) throw new Error("Utilisateur non authentifié."); return req.user.userId; }
  private param(req: AuthenticatedRequest, key: string) { const value = req.params[key]; if (typeof value !== "string" || !value) throw new Error("Paramètre invalide."); return value; }
  private enumValue<T extends Record<string, string>>(source: T, value: unknown): T[keyof T] | undefined { const raw = optionalString(value); return raw && Object.values(source).includes(raw) ? raw as T[keyof T] : undefined; }
  private error(error: unknown, res: Response) { if (error instanceof ZodError) { res.status(400).json({ success: false, message: "Erreur de validation", errors: error.issues }); return; } const message = error instanceof Error ? error.message : "Erreur interne."; res.status(message.includes("introuvable") ? 404 : 400).json({ success: false, message }); }
}
