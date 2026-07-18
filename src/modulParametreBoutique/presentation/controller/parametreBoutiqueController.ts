import { Response } from "express";
import { ZodError } from "zod";
import { TypeEntreprise } from "@prisma/client";
import { ParametreBoutiqueUseCase } from "../../application/usecase/parametreBoutiqueUsecase";
import { AuthenticatedRequest } from "../../../shared/types/authTypes";
import { APP_MESSAGES } from "../../../shared/errorMessages/errorMessages";
import { mapPrismaError } from "../../../shared/errorMessages/prismaErrorMapper";
import {
  updateBoutiqueAdresseSchema,
  updateBoutiqueDeviseSchema,
  updateBoutiqueDeviseSecondaireSchema,
  updateBoutiqueNomSchema,
  updateBoutiqueRccmSchema,
  updateBoutiqueTauxDeviseSecondaireSchema,
  updateBoutiqueTypeEntrepriseSchema,
} from "../validationZod/parametreBoutiqueSchema";

export class ParametreBoutiqueController {
  constructor(private readonly parametreBoutiqueUseCase: ParametreBoutiqueUseCase) {}

  async getBoutique(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutique = await this.parametreBoutiqueUseCase.getBoutique(this.getBoutiqueId(req));

      if (!boutique) {
        res.status(404).json({ success: false, message: "Boutique introuvable." });
        return;
      }

      res.status(200).json({ success: true, data: boutique });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async updateNom(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { nom } = updateBoutiqueNomSchema.parse(req.body);
      const boutique = await this.parametreBoutiqueUseCase.updateNom(this.getBoutiqueId(req), nom);
      res.status(200).json({ success: true, data: boutique });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async updateAdresse(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { adresse } = updateBoutiqueAdresseSchema.parse(req.body);
      const boutique = await this.parametreBoutiqueUseCase.updateAdresse(this.getBoutiqueId(req), adresse);
      res.status(200).json({ success: true, data: boutique });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async updateDevise(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { devise } = updateBoutiqueDeviseSchema.parse(req.body);
      const boutique = await this.parametreBoutiqueUseCase.updateDevise(this.getBoutiqueId(req), devise);
      res.status(200).json({ success: true, data: boutique });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async updateDeviseSecondaire(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { deviseSecondaire } = updateBoutiqueDeviseSecondaireSchema.parse(req.body);
      const boutique = await this.parametreBoutiqueUseCase.updateDeviseSecondaire(this.getBoutiqueId(req), deviseSecondaire);
      res.status(200).json({ success: true, data: boutique });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async updateTauxDeviseSecondaire(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { tauxDeviseSecondaire } = updateBoutiqueTauxDeviseSecondaireSchema.parse(req.body);
      const boutique = await this.parametreBoutiqueUseCase.updateTauxDeviseSecondaire(this.getBoutiqueId(req), tauxDeviseSecondaire);
      res.status(200).json({ success: true, data: boutique });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async updateRccm(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { RCCM } = updateBoutiqueRccmSchema.parse(req.body);
      const boutique = await this.parametreBoutiqueUseCase.updateRccm(this.getBoutiqueId(req), RCCM);
      res.status(200).json({ success: true, data: boutique });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async updateTypeEntreprise(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { typeEntreprise } = updateBoutiqueTypeEntrepriseSchema.parse(req.body);
      const boutique = await this.parametreBoutiqueUseCase.updateTypeEntreprise(
        this.getBoutiqueId(req),
        typeEntreprise as TypeEntreprise
      );
      res.status(200).json({ success: true, data: boutique });
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
