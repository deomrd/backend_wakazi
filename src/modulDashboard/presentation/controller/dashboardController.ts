import { Response } from "express";
import { ZodError } from "zod";
import { DashboardUseCase } from "../../application/usecase/dashboardUsecase";
import { AuthenticatedRequest } from "../../../shared/types/authTypes";
import { APP_MESSAGES } from "../../../shared/errorMessages/errorMessages";
import { dashboardQuerySchema } from "../validationZod/dashboardSchema";

export class DashboardController {
  constructor(private readonly dashboardUseCase: DashboardUseCase) {}

  async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId(req);
      const query = dashboardQuerySchema.parse(req.query);
      const summary = await this.dashboardUseCase.getSummary(boutiqueId, query);

      res.status(200).json({ success: true, data: summary });
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

    const message = error instanceof Error ? error.message : APP_MESSAGES.GLOBAL.INTERNAL_ERROR;
    res.status(400).json({ success: false, message });
  }
}
