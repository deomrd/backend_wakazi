import { Response } from "express";
import { ZodError } from "zod";
import { VenteUseCase } from "../../application/usecase/venteUsecase";
import { AuthenticatedRequest } from "../../../shared/types/authTypes";
import { cancelVenteSchema, createClientSchema, createVenteSchema, payDetteSchema, refundVenteSchema } from "../validationZod/venteSchema";
import { APP_MESSAGES } from "../../../shared/errorMessages/errorMessages";
import { mapPrismaError } from "../../../shared/errorMessages/prismaErrorMapper";
import { parsePaginationQuery } from "../../../shared/pagination/pagination";
import { MethodePaiement, StatutDette, StatutVente } from "@prisma/client";
import { optionalString, parseDateRange } from "../../../shared/filters/queryFilters";

export class VenteController {
  constructor(private readonly venteUseCase: VenteUseCase) {}

  async createClient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const data = createClientSchema.parse(req.body);
      const client = await this.venteUseCase.createClient(boutiqueId, data);

      res.status(201).json({ success: true, data: client });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listClients(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const result = await this.venteUseCase.listClients(boutiqueId, parsePaginationQuery(req.query), {
        search: optionalString(req.query.search),
      });

      res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async createVente(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const userId = this.getUserId(req);
      const data = createVenteSchema.parse(req.body);
      const vente = await this.venteUseCase.createVente(boutiqueId, { ...data, userId });

      res.status(201).json({ success: true, data: vente });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listVentes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const result = await this.venteUseCase.listVentes(boutiqueId, parsePaginationQuery(req.query), {
        ...parseDateRange(req.query),
        clientId: optionalString(req.query.clientId),
        search: optionalString(req.query.search),
        statut: this.enumValue(StatutVente, req.query.statut),
        methodePaiement: this.enumValue(MethodePaiement, req.query.methodePaiement),
      });

      res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getVenteById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const venteId = this.getParam(req, "id");
      const vente = await this.venteUseCase.getVenteById(boutiqueId, venteId);

      if (!vente) {
        res.status(404).json({ success: false, message: "Vente non trouvée." });
        return;
      }

      res.status(200).json({ success: true, data: vente });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async cancelVente(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = cancelVenteSchema.parse(req.body);
      const vente = await this.venteUseCase.cancelVente(this.getBoutiqueId(req), {
        venteId: this.getParam(req, "id"),
        userId: this.getUserId(req),
        motif: data.motif,
      });
      res.status(200).json({ success: true, data: vente });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async refundVente(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = refundVenteSchema.parse(req.body);
      const remboursement = await this.venteUseCase.refundVente(this.getBoutiqueId(req), {
        ...data,
        venteId: this.getParam(req, "id"),
        userId: this.getUserId(req),
      });
      res.status(201).json({ success: true, data: remboursement });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getRecuVente(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const recu = await this.venteUseCase.getRecuVente(this.getBoutiqueId(req), this.getParam(req, "id"));
      if (!recu) {
        res.status(404).json({ success: false, message: "Vente non trouvée." });
        return;
      }
      res.status(200).json({ success: true, data: recu });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listDettes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const result = await this.venteUseCase.listDettes(boutiqueId, parsePaginationQuery(req.query), {
        ...parseDateRange(req.query),
        clientId: optionalString(req.query.clientId),
        search: optionalString(req.query.search),
        statut: this.enumValue(StatutDette, req.query.statut),
      });

      res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async payDette(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const detteId = this.getParam(req, "id");
      const data = payDetteSchema.parse(req.body);
      const dette = await this.venteUseCase.payDette(boutiqueId, { ...data, detteId });

      res.status(200).json({ success: true, data: dette });
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
    const statusCode = message.includes("introuvable") || message.includes("non trouv") ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      message,
    });
  }
}
