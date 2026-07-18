import { Response } from "express";
import { ZodError } from "zod";
import { DepenseUseCase } from "../../application/usecase/depenseUsecase";
import { AuthenticatedRequest } from "../../../shared/types/authTypes";
import { createDepenseSchema, updateDepenseSchema } from "../validationZod/depenseSchema";
import { APP_MESSAGES } from "../../../shared/errorMessages/errorMessages";
import { mapPrismaError } from "../../../shared/errorMessages/prismaErrorMapper";
import { parsePaginationQuery } from "../../../shared/pagination/pagination";
import { CategorieDepense, MethodePaiement } from "@prisma/client";
import { optionalString, parseDateRange } from "../../../shared/filters/queryFilters";

export class DepenseController {
  constructor(private readonly depenseUseCase: DepenseUseCase) {}

  async createDepense(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const actor = this.getActor(req);
      const data = createDepenseSchema.parse(req.body);
      const depense = await this.depenseUseCase.createDepense(boutiqueId, actor, { ...data, userId: actor.userId });

      res.status(201).json({ success: true, data: depense });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listDepenses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const actor = this.getActor(req);
      const result = await this.depenseUseCase.listDepenses(boutiqueId, actor, parsePaginationQuery(req.query), {
        ...parseDateRange(req.query),
        search: optionalString(req.query.search),
        userId: optionalString(req.query.userId),
        categorie: this.enumValue(CategorieDepense, req.query.categorie),
        methodePaiement: this.enumValue(MethodePaiement, req.query.methodePaiement),
      });

      res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getDepenseById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const actor = this.getActor(req);
      const depenseId = this.getParam(req, "id");
      const depense = await this.depenseUseCase.getDepenseById(boutiqueId, actor, depenseId);

      if (!depense) {
        res.status(404).json({ success: false, message: "Dépense non trouvée." });
        return;
      }

      res.status(200).json({ success: true, data: depense });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async updateDepense(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const actor = this.getActor(req);
      const depenseId = this.getParam(req, "id");
      const data = updateDepenseSchema.parse(req.body);
      const depense = await this.depenseUseCase.updateDepense(boutiqueId, actor, depenseId, data);

      res.status(200).json({ success: true, data: depense });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async deleteDepense(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const actor = this.getActor(req);
      const depenseId = this.getParam(req, "id");
      await this.depenseUseCase.deleteDepense(boutiqueId, actor, depenseId);

      res.status(204).send();
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

  private getActor(req: AuthenticatedRequest) {
    if (!req.user?.userId || !req.user?.role) {
      throw new Error(APP_MESSAGES.AUTH.INVALID_TOKEN);
    }

    return {
      userId: req.user.userId,
      role: req.user.role,
    };
  }

  private getParam(req: AuthenticatedRequest, name: string): string {
    const value = req.params[name];

    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Paramètre ${name} invalide.`);
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
        message: "Erreur de validation des données",
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
    const statusCode = message.includes("introuvable") || message.includes("non trouv") ? 404 : 400;

    res.status(statusCode).json({ success: false, message });
  }
}
