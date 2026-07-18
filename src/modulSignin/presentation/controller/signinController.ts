import { Request, Response } from "express";
import { ZodError } from "zod";
import { SigninUseCase } from "../../application/usecase/signinUsecase";
import { changePinSchema, changeUsernameSchema, signinSchema } from "../validationZod/signinSchema";
import { InvalidCredentialsError, AccountDisabledError, InvalidPinFormatError } from "../../../shared/errorMessages/customErrors";
import { APP_MESSAGES } from "../../../shared/errorMessages/errorMessages";
import { SigninEntity } from "../../domaine/entity/signinEntity";
import { AuthenticatedRequest } from "../../../shared/types/authTypes";
import { mapPrismaError } from "../../../shared/errorMessages/prismaErrorMapper";

export class SigninController {
  constructor(private readonly signinUseCase: SigninUseCase) {}

  async signin(req: Request, res: Response): Promise<void> {
    try {
      const signinData: SigninEntity = signinSchema.parse(req.body);
      const { user, token } = await this.signinUseCase.execute(signinData);

      res.status(200).json({
        success: true,
        message: APP_MESSAGES.SIGNIN.SUCCESS,
        token,
        data: user,
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  async changePin(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: APP_MESSAGES.AUTH.INVALID_TOKEN });
        return;
      }

      const data = changePinSchema.parse(req.body);
      const { user, token } = await this.signinUseCase.changePin(req.user.userId, data.currentPin, data.newPin);

      res.status(200).json({
        success: true,
        message: "PIN modifie avec succes.",
        token,
        data: user,
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  async changeUsername(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: APP_MESSAGES.AUTH.INVALID_TOKEN });
        return;
      }

      const data = changeUsernameSchema.parse(req.body);
      const user = await this.signinUseCase.changeUsername(req.user.userId, data.currentPin, data.nomUtilisateur);

      res.status(200).json({
        success: true,
        message: "Nom d'utilisateur modifie avec succes.",
        data: user,
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: APP_MESSAGES.AUTH.INVALID_TOKEN });
        return;
      }
      await this.signinUseCase.logout(req.user.userId);
      res.status(204).send();
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  private handleError(error: any, res: Response): void {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Format de donnees invalide",
        errors: error.issues.map((e: any) => ({ path: e.path, message: e.message })),
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

    let statusCode = 400;
    if (error instanceof InvalidCredentialsError) statusCode = 401;
    else if (error instanceof AccountDisabledError) statusCode = 403;
    else if (error instanceof InvalidPinFormatError) statusCode = 400;

    console.error(`[SigninController] Error: ${error.message}`);

    res.status(statusCode).json({
      success: false,
      message: error.message || APP_MESSAGES.GLOBAL.INTERNAL_ERROR,
    });
  }
}
