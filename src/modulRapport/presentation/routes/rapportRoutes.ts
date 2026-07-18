import { RoleNom } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../../../config/db";
import { hasRole, isAuthenticated } from "../../../shared/security/authMiddleware";
import { RapportUseCase } from "../../application/usecase/rapportUsecase";
import { PrismaRapportRepository } from "../../infrastructure/prismaRepository/prismaRapportRepository";
import { RapportController } from "../controller/rapportController";

const router = Router();
const controller = new RapportController(new RapportUseCase(new PrismaRapportRepository(prisma)));
router.use(isAuthenticated, hasRole([RoleNom.PROPRIETAIRE, RoleNom.GERANT]));
router.get("/financier", (req, res) => controller.financial(req, res));

export default router;
