import { Response } from "express";
import { ZodError } from "zod";
import { EmployeUseCase } from "../../application/usecase/employeUsecase";
import { EmployeeRoleNom } from "../../domaine/entity/employeEntity";
import { createEmployeSchema, updateEmployeSchema } from "../validationZod/employeSchema";
import { AuthenticatedRequest } from "../../../shared/types/authTypes";
import { APP_MESSAGES } from "../../../shared/errorMessages/errorMessages";
import { parsePaginationQuery } from "../../../shared/pagination/pagination";
import { optionalBoolean, optionalString } from "../../../shared/filters/queryFilters";
import { mapPrismaError } from "../../../shared/errorMessages/prismaErrorMapper";

export class EmployeController {
  constructor(private readonly employeUseCase: EmployeUseCase) {}

  async createEmploye(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const data = createEmployeSchema.parse(req.body);
      const result = await this.employeUseCase.createEmploye(boutiqueId, data);

      res.status(201).json({
        success: true,
        data: result.employe,
        pinParDefaut: result.pinParDefaut,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listEmployes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const roleNom = this.employeeRoleValue(req.query.roleNom);
      const result = await this.employeUseCase.listEmployes(boutiqueId, parsePaginationQuery(req.query), {
        search: optionalString(req.query.search),
        roleNom,
        statut: optionalBoolean(req.query.statut),
      });

      res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getEmployeById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employe = await this.employeUseCase.getEmployeById(this.getBoutiqueId(req), this.getParam(req, "id"));

      if (!employe) {
        res.status(404).json({ success: false, message: "Employe introuvable dans cette boutique." });
        return;
      }

      res.status(200).json({ success: true, data: employe });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async updateEmploye(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = updateEmployeSchema.parse(req.body);
      const employe = await this.employeUseCase.updateEmploye(this.getBoutiqueId(req), this.getParam(req, "id"), data);

      res.status(200).json({ success: true, data: employe });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async deactivateEmploye(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employe = await this.employeUseCase.deactivateEmploye(this.getBoutiqueId(req), this.getParam(req, "id"));
      res.status(200).json({ success: true, data: employe });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async reactivateEmploye(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employe = await this.employeUseCase.reactivateEmploye(this.getBoutiqueId(req), this.getParam(req, "id"));
      res.status(200).json({ success: true, data: employe });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async resetPin(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await this.employeUseCase.resetPin(this.getBoutiqueId(req), this.getParam(req, "id"));
      res.status(200).json({
        success: true,
        data: result.employe,
        pinParDefaut: result.pinParDefaut,
      });
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

  private getParam(req: AuthenticatedRequest, name: string): string {
    const value = req.params[name];

    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Parametre ${name} invalide.`);
    }

    return value;
  }

  private employeeRoleValue(value: unknown): EmployeeRoleNom | undefined {
    const raw = optionalString(value);
    return raw === "GERANT" || raw === "VENDEUR" ? raw : undefined;
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
    const statusCode = message.includes("introuvable") ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      message,
    });
  }
}
