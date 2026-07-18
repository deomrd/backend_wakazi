import { Response } from "express";
import { ZodError } from "zod";
import { StockUseCase } from "../../application/usecase/stockUsecase";
import { AuthenticatedRequest } from "../../../shared/types/authTypes";
import {
  categorieSchema,
  createProduitSchema,
  ravitaillementSchema,
  stockMovementSchema,
  updateProduitSchema,
} from "../validationZod/stockSchema";
import { APP_MESSAGES } from "../../../shared/errorMessages/errorMessages";
import { mapPrismaError } from "../../../shared/errorMessages/prismaErrorMapper";
import { parsePaginationQuery } from "../../../shared/pagination/pagination";
import { TypeStock, UniteMesure } from "@prisma/client";
import { optionalBoolean, optionalString, parseDateRange } from "../../../shared/filters/queryFilters";

export class StockController {
  constructor(private readonly stockUseCase: StockUseCase) {}

  async createCategorie(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const data = categorieSchema.parse(req.body);
      const categorie = await this.stockUseCase.createCategorie(boutiqueId, data.nom);

      res.status(201).json({ success: true, data: categorie });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const result = await this.stockUseCase.listCategories(boutiqueId, parsePaginationQuery(req.query), {
        search: optionalString(req.query.search),
      });

      res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async createProduit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const data = createProduitSchema.parse(req.body);
      const produit = await this.stockUseCase.createProduit(boutiqueId, data);

      res.status(201).json({ success: true, data: produit });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listProduits(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const result = await this.stockUseCase.listProduits(boutiqueId, parsePaginationQuery(req.query), {
        search: optionalString(req.query.search),
        categorieId: optionalString(req.query.categorieId),
        uniteMesure: this.enumValue(UniteMesure, req.query.uniteMesure),
        stockFaible: optionalBoolean(req.query.stockFaible),
      });

      res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getProduitById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const produitId = this.getParam(req, "id");
      const produit = await this.stockUseCase.getProduitById(boutiqueId, produitId);

      if (!produit) {
        res.status(404).json({ success: false, message: "Produit non trouvé." });
        return;
      }

      res.status(200).json({ success: true, data: produit });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getProduitByCodeQR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const codeQR = this.getParam(req, "codeQR");
      const produit = await this.stockUseCase.getProduitByCodeQR(boutiqueId, codeQR);

      if (!produit) {
        res.status(404).json({ success: false, message: "Produit non trouve pour ce QR." });
        return;
      }

      res.status(200).json({ success: true, data: produit });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async updateProduit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const data = updateProduitSchema.parse(req.body);
      const produitId = this.getParam(req, "id");
      const produit = await this.stockUseCase.updateProduit(boutiqueId, produitId, data);

      res.status(200).json({ success: true, data: produit });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async deleteProduit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const produitId = this.getParam(req, "id");
      await this.stockUseCase.deleteProduit(boutiqueId, produitId);

      res.status(204).send();
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async createStockMovement(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const data = stockMovementSchema.parse(req.body);
      const movement = await this.stockUseCase.createStockMovement(boutiqueId, data);

      res.status(201).json({ success: true, data: movement });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listStockMovements(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const result = await this.stockUseCase.listStockMovements(boutiqueId, parsePaginationQuery(req.query), {
        ...parseDateRange(req.query),
        produitId: optionalString(req.query.produitId),
        type: this.enumValue(TypeStock, req.query.type),
      });

      res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async createRavitaillement(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const userId = this.getUserId(req);
      const data = ravitaillementSchema.parse(req.body);
      const ravitaillement = await this.stockUseCase.createRavitaillement(boutiqueId, {
        ...data,
        userId,
        produitId: this.getParam(req, "id"),
      });

      res.status(201).json({ success: true, data: ravitaillement });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listRavitaillements(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const result = await this.stockUseCase.listRavitaillements(boutiqueId, parsePaginationQuery(req.query), {
        ...parseDateRange(req.query),
        produitId: optionalString(req.query.produitId),
        userId: optionalString(req.query.userId),
        search: optionalString(req.query.search),
      });

      res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
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
    const statusCode = message.includes("introuvable") || message.includes("non trouvé") ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      message,
    });
  }
}
