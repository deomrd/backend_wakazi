import { Response } from "express";
import { parseDateRange } from "../../../shared/filters/queryFilters";
import { AuthenticatedRequest } from "../../../shared/types/authTypes";
import { RapportUseCase } from "../../application/usecase/rapportUsecase";

export class RapportController {
  constructor(private readonly useCase: RapportUseCase) {}
  async financial(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.boutiqueId) throw new Error("Boutique non authentifiée.");
      const data = await this.useCase.getFinancialReport(req.user.boutiqueId, parseDateRange(req.query));
      res.json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : "Erreur interne." });
    }
  }
}
