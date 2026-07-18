import { Router } from "express";
import { PrismaSignupRepository } from "../../infrastructure/prismaRepository/prismaSignupRepository";
import { SignupUseCase } from "../../application/usecase/signupUsecase";
import { SignupController } from "../controller/signupController";
import { prisma } from "../../../config/db";
import { createRateLimiter } from "../../../shared/security/rateLimit";

const signupRouter = Router();

// --- Injection de Dépendances ---
const signupRepository = new PrismaSignupRepository(prisma);
const signupUseCase = new SignupUseCase(signupRepository);
const signupController = new SignupController(signupUseCase);
const signupRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: "Trop de créations de compte depuis cette adresse. Réessayez plus tard.",
});

/**
 * Route pour l'inscription d'un propriétaire et sa boutique.
 * URL finale sera probablement : /api/auth/signup (selon votre config principale)
 */
signupRouter.post("/create_account", signupRateLimiter, (req, res) => signupController.signup(req, res));

export default signupRouter;
