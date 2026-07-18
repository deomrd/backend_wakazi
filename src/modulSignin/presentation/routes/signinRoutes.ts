import { Router } from "express";
import { PrismaSigninRepository } from "../../infrastructure/prismaRepository/prismaSigninRepository"; 
import { JwtAuthService } from "../../infrastructure/security/jwtAuthService";
import { SigninController } from "../controller/signinController";
import { SigninUseCase } from "../../application/usecase/signinUsecase";
import { prisma } from "../../../config/db";
import { isAuthenticated } from "../../../shared/security/authMiddleware";
import { createRateLimiter } from "../../../shared/security/rateLimit";

const signinRouter = Router();

// --- Injection de Dépendances ---
// Infrastructure
const signinRepository = new PrismaSigninRepository(prisma);
const authService = new JwtAuthService();
const signinUseCase = new SigninUseCase(signinRepository, authService);
const signinController = new SigninController(signinUseCase);
const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    const login = String(req.body?.telephone || req.body?.nomUtilisateur || "anonymous").trim().toLowerCase();
    return `${req.ip}:${login}`;
  },
  message: "Trop de tentatives de connexion. Réessayez dans quelques minutes.",
});

/**
 * Route pour la connexion d'un utilisateur.
 * POST /signin
 */

signinRouter.post("/login", loginRateLimiter, (req, res) => signinController.signin(req, res));
signinRouter.post("/change-pin", isAuthenticated, (req, res) => signinController.changePin(req, res));
signinRouter.patch("/username", isAuthenticated, (req, res) => signinController.changeUsername(req, res));
signinRouter.post("/logout", isAuthenticated, (req, res) => signinController.logout(req, res));

export default signinRouter;
