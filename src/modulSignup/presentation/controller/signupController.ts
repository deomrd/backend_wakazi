import { Request, Response } from "express";
import { ZodError } from "zod";
import { SignupUseCase } from "../../application/usecase/signupUsecase";
import { TypeEntreprise } from "@prisma/client"; // Importez TypeEntreprise pour l'assertion de type
import { SignupEntity } from "../../domaine/entity/signupEntity";
import { signupSchema } from "../validationZod/signupSchema";
import { APP_MESSAGES } from "../../../shared/errorMessages/errorMessages";
import { parsePaginationQuery } from "../../../shared/pagination/pagination";

/**
 * Controller pour gérer les requêtes HTTP d'inscription.
 */
export class SignupController {
  constructor(private readonly signupUseCase: SignupUseCase) {}

  /**
   * Endpoint POST /signup
   */
  async signup(req: Request, res: Response): Promise<void> {
    try {
      // 1. Validation des données entrantes avec Zod
      const parsedData = signupSchema.parse(req.body);
      const signupData: SignupEntity = {
        ...parsedData,
        typeEntreprise: parsedData.typeEntreprise as TypeEntreprise, // Assertion de type pour aligner avec SignupEntity
      };

      // Exécution du cas d'utilisation (Logique métier + Sécurité + Persistance)
      await this.signupUseCase.execute(signupData);

      res.status(201).json({
        success: true,
        message: APP_MESSAGES.SIGNUP.SUCCESS,
      });
    } catch (error: any) {
      // Gestion spécifique des erreurs Zod
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "Erreur de validation des données",
          errors: error.issues.map((e: any) => ({ path: e.path, message: e.message })),
        });
        return;
      }

      // Gestion des erreurs professionnelles
      const statusCode = error.message.includes("Conflit") ? 409 : 400;
      
      console.error(`[SignupController] Erreur: ${error.message}`);
      
      res.status(statusCode).json({
        success: false,
        message: error.message || APP_MESSAGES.GLOBAL.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Endpoint GET /signup/:id
   */
  async getAccountById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const account = await this.signupUseCase.getAccountById(id);

      if (!account) {
        res.status(404).json({ success: false, message: APP_MESSAGES.SIGNUP.NOT_FOUND });
        return;
      }

      // IMPORTANT: Ne pas renvoyer le mot de passe haché au client
      const { motDePasse, ...accountWithoutPassword } = account;
      res.status(200).json({ success: true, data: accountWithoutPassword });
    } catch (error: any) {
      console.error(`[SignupController] Erreur lors de la récupération par ID: ${error.message}`);
      res.status(500).json({ success: false, message: error.message || APP_MESSAGES.GLOBAL.INTERNAL_ERROR });
    }
  }

  /**
   * Endpoint GET /signup/by-telephone/:telephone
   */
  async getAccountByTelephone(req: Request, res: Response): Promise<void> {
    try {
      const telephone = req.params.telephone as string;
      // Validation de base pour le paramètre telephone
      if (!telephone || !/^\d{9,15}$/.test(telephone)) {
        res.status(400).json({ success: false, message: APP_MESSAGES.VALIDATION.INVALID_PHONE });
        return;
      }

      const account = await this.signupUseCase.getAccountByTelephone(telephone);

      if (!account) {
        res.status(404).json({ success: false, message: APP_MESSAGES.SIGNUP.NOT_FOUND });
        return;
      }

      // IMPORTANT: Ne pas renvoyer le mot de passe haché au client
      const { motDePasse, ...accountWithoutPassword } = account;
      res.status(200).json({ success: true, data: accountWithoutPassword });
    } catch (error: any) {
      console.error(`[SignupController] Erreur lors de la récupération par téléphone: ${error.message}`);
      res.status(500).json({ success: false, message: error.message || APP_MESSAGES.GLOBAL.INTERNAL_ERROR });
    }
  }

  /**
   * Endpoint GET /signup
   * NOTE: Pour une application professionnelle, cette méthode devrait inclure la pagination et des filtres.
   */
  async getAllAccounts(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.signupUseCase.getAllAccounts(parsePaginationQuery(req.query));

      // IMPORTANT: Ne pas renvoyer les mots de passe hachés au client
      const accountsWithoutPasswords = result.data.map(account => {
        const { motDePasse, ...rest } = account;
        return rest;
      });

      res.status(200).json({ success: true, data: accountsWithoutPasswords, pagination: result.pagination });
    } catch (error: any) {
      console.error(`[SignupController] Erreur lors de la récupération de tous les comptes: ${error.message}`);
      res.status(500).json({ success: false, message: error.message || APP_MESSAGES.GLOBAL.INTERNAL_ERROR });
    }
  }

  /**
   * Endpoint PATCH /signup/:id
   */
  async updateAccount(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      // Utiliser un schéma partiel pour la validation des mises à jour
      const updateSchema = signupSchema.partial();
      const parsedUpdateData = updateSchema.parse(req.body);
      const updateData: Partial<SignupEntity> = {
        ...parsedUpdateData,
        typeEntreprise: parsedUpdateData.typeEntreprise as TypeEntreprise | undefined, // Assertion de type pour les mises à jour
      };

      await this.signupUseCase.updateAccount(id, updateData);

      res.status(200).json({ success: true, message: APP_MESSAGES.SIGNUP.UPDATE_SUCCESS });
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "Erreur de validation des mises à jour",
          errors: error.issues.map((e: any) => ({ path: e.path, message: e.message })),
        });
        return;
      }

      const statusCode = error.message.includes("Conflit") ? 409 : 400;
      
      console.error(`[SignupController] Erreur lors de la mise à jour: ${error.message}`);
      
      res.status(statusCode).json({
        success: false,
        message: error.message || APP_MESSAGES.GLOBAL.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Endpoint DELETE /signup/:id
   */
  async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      await this.signupUseCase.deleteAccount(id);
      res.status(204).send(); // 204 No Content pour une suppression réussie
    } catch (error: any) {
      console.error(`[SignupController] Erreur lors de la suppression: ${error.message}`);
      res.status(500).json({ success: false, message: error.message || APP_MESSAGES.GLOBAL.INTERNAL_ERROR });
    }
  }
}
