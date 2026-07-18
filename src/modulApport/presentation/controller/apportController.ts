import { Response } from "express";
import { MethodePaiement, StatutApport } from "@prisma/client";
import { ZodError } from "zod";
import { ApportUseCase } from "../../application/usecase/apportUsecase";
import { AuthenticatedRequest } from "../../../shared/types/authTypes";
import { APP_MESSAGES } from "../../../shared/errorMessages/errorMessages";
import { mapPrismaError } from "../../../shared/errorMessages/prismaErrorMapper";
import { parsePaginationQuery } from "../../../shared/pagination/pagination";
import { optionalString, parseDateRange } from "../../../shared/filters/queryFilters";
import { createApportSchema, createRetraitApportSchema } from "../validationZod/apportSchema";

export class ApportController {
  constructor(private readonly apportUseCase: ApportUseCase) {}

  async createApport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = createApportSchema.parse(req.body);
      const apport = await this.apportUseCase.createApport(this.getBoutiqueId(req), {
        ...data,
        userId: this.getUserId(req),
      });

      res.status(201).json({ success: true, data: apport });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listApports(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await this.apportUseCase.listApports(this.getBoutiqueId(req), parsePaginationQuery(req.query), {
        ...parseDateRange(req.query),
        search: optionalString(req.query.search),
        userId: optionalString(req.query.userId),
        statut: this.enumValue(StatutApport, req.query.statut),
        methodePaiement: this.enumValue(MethodePaiement, req.query.methodePaiement),
      });

      res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getApportById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const apport = await this.apportUseCase.getApportById(this.getBoutiqueId(req), this.getParam(req, "id"));

      if (!apport) {
        res.status(404).json({ success: false, message: "Apport introuvable dans cette boutique." });
        return;
      }

      res.status(200).json({ success: true, data: apport });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async createRetrait(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = createRetraitApportSchema.parse(req.body);
      const apport = await this.apportUseCase.createRetrait(this.getBoutiqueId(req), {
        ...data,
        userId: this.getUserId(req),
        apportId: this.getParam(req, "id"),
      });

      res.status(201).json({ success: true, data: apport });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private getBoutiqueId(req: AuthenticatedRequest): string {
    if (!req.user?.boutiqueId) throw new Error(APP_MESSAGES.AUTH.INVALID_TOKEN);
    return req.user.boutiqueId;
  }

  private getUserId(req: AuthenticatedRequest): string {
    if (!req.user?.userId) throw new Error(APP_MESSAGES.AUTH.INVALID_TOKEN);
    return req.user.userId;
  }

  private getParam(req: AuthenticatedRequest, name: string): string {
    const value = req.params[name];
    if (typeof value !== "string" || !value.trim()) throw new Error(`Parametre ${name} invalide.`);
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
      res.status(prismaError.statusCode).json({ success: false, message: prismaError.message });
      return;
    }

    const message = error instanceof Error ? error.message : APP_MESSAGES.GLOBAL.INTERNAL_ERROR;
    res.status(message.includes("introuvable") ? 404 : 400).json({ success: false, message });
  }
}
