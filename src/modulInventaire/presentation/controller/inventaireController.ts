import { Response } from "express";
import { ZodError } from "zod";
import { optionalString, parseDateRange } from "../../../shared/filters/queryFilters";
import { parsePaginationQuery } from "../../../shared/pagination/pagination";
import { AuthenticatedRequest } from "../../../shared/types/authTypes";
import { InventaireUseCase } from "../../application/usecase/inventaireUsecase";
import { createInventaireSchema } from "../validationZod/inventaireSchema";

export class InventaireController {
  constructor(private readonly useCase: InventaireUseCase) {}
  async create(req: AuthenticatedRequest, res: Response) {
    try { const data = await this.useCase.create(this.boutiqueId(req), { ...createInventaireSchema.parse(req.body), userId: this.userId(req) }); res.status(201).json({ success: true, data }); }
    catch (error) { this.error(error, res); }
  }
  async list(req: AuthenticatedRequest, res: Response) {
    try { const result = await this.useCase.list(this.boutiqueId(req), parsePaginationQuery(req.query), { ...parseDateRange(req.query), search: optionalString(req.query.search) }); res.json({ success: true, data: result.data, pagination: result.pagination }); }
    catch (error) { this.error(error, res); }
  }
  async get(req: AuthenticatedRequest, res: Response) {
    try { const data = await this.useCase.getById(this.boutiqueId(req), this.param(req, "id")); if (!data) { res.status(404).json({ success: false, message: "Inventaire non trouvé." }); return; } res.json({ success: true, data }); }
    catch (error) { this.error(error, res); }
  }
  private boutiqueId(req: AuthenticatedRequest) { if (!req.user?.boutiqueId) throw new Error("Boutique non authentifiée."); return req.user.boutiqueId; }
  private userId(req: AuthenticatedRequest) { if (!req.user?.userId) throw new Error("Utilisateur non authentifié."); return req.user.userId; }
  private param(req: AuthenticatedRequest, key: string) { const value = req.params[key]; if (typeof value !== "string" || !value) throw new Error("Paramètre invalide."); return value; }
  private error(error: unknown, res: Response) { if (error instanceof ZodError) { res.status(400).json({ success: false, message: "Erreur de validation", errors: error.issues }); return; } const message = error instanceof Error ? error.message : "Erreur interne."; res.status(message.includes("introuvable") || message.includes("non trouvé") ? 404 : 400).json({ success: false, message }); }
}
