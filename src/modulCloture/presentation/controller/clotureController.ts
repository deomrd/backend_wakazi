import { Response } from "express";
import { ZodError } from "zod";
import { ClotureUseCase } from "../../application/usecase/clotureUsecase";
import { AuthenticatedRequest } from "../../../shared/types/authTypes";
import { createClotureSchema, previewClotureSchema } from "../validationZod/clotureSchema";
import { APP_MESSAGES } from "../../../shared/errorMessages/errorMessages";
import { mapPrismaError } from "../../../shared/errorMessages/prismaErrorMapper";
import { parsePaginationQuery } from "../../../shared/pagination/pagination";
import { StatutClotureJournee } from "@prisma/client";
import { optionalString, parseDateRange } from "../../../shared/filters/queryFilters";

export class ClotureController {
  constructor(private readonly clotureUseCase: ClotureUseCase) {}

  async previewClotureJournee(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const data = previewClotureSchema.parse(req.query);
      const preview = await this.clotureUseCase.previewClotureJournee(boutiqueId, data);

      res.status(200).json({ success: true, data: preview });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async createClotureJournee(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const userId = this.getUserId(req);
      const data = createClotureSchema.parse(req.body);
      const cloture = await this.clotureUseCase.createClotureJournee(boutiqueId, userId, data);

      res.status(201).json({ success: true, data: cloture });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listCloturesJournee(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const result = await this.clotureUseCase.listCloturesJournee(boutiqueId, parsePaginationQuery(req.query), {
        ...parseDateRange(req.query),
        userId: optionalString(req.query.userId),
        statut: this.enumValue(StatutClotureJournee, req.query.statut),
      });

      res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getClotureJourneeById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const clotureJourneeId = this.getParam(req, "id");
      const cloture = await this.clotureUseCase.getClotureJourneeById(boutiqueId, clotureJourneeId);

      if (!cloture) {
        res.status(404).json({ success: false, message: "Cloture de journee non trouvee." });
        return;
      }

      res.status(200).json({ success: true, data: cloture });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private getBoutiqueId(req: AuthenticatedRequest): string {
    if (!req.user?.boutiqueId) {
      throw new Error(APP_MESSAGES.AUTH.INVALID_TOKEN);
    }

    return req.user.boutiqueId;
  }

  private getUserId(req: AuthenticatedRequest): string {
    if (!req.user?.userId) {
      throw new Error(APP_MESSAGES.AUTH.INVALID_TOKEN);
    }

    return req.user.userId;
  }

  private getParam(req: AuthenticatedRequest, name: string): string {
    const value = req.params[name];

    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Parametre ${name} invalide.`);
    }

    return value;
  }

  private enumValue<T extends Record<string, string>>(enumObject: T, value: unknown): T[keyof T] | undefined {
    const raw = optionalString(value);
    return raw && Object.values(enumObject).includes(raw) ? raw as T[keyof T] : undefined;
  }

  private handleError(error: unknown, res: Response): void {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Erreur de validation des donnees",
        errors: error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
      });
      return;
    }

    const prismaError = mapPrismaError(error);
    if (prismaError) {
      res.status(prismaError.statusCode).json({
        success: false,
        message: prismaError.message,
      });
      return;
    }

    const message = error instanceof Error ? error.message : APP_MESSAGES.GLOBAL.INTERNAL_ERROR;
    const statusCode = message.includes("introuvable") || message.includes("non trouve") ? 404 : 400;

    res.status(statusCode).json({ success: false, message });
  }
}
