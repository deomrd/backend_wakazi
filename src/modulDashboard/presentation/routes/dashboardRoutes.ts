import { Router } from "express";
import { RoleNom } from "@prisma/client";
import { isAuthenticated, hasRole } from "../../../shared/security/authMiddleware";
import { DashboardUseCase } from "../../application/usecase/dashboardUsecase";
import { PrismaDashboardRepository } from "../../infrastructure/prismaRepository/prismaDashboardRepository";
import { DashboardController } from "../controller/dashboardController";
import { prisma } from "../../../config/db";

const dashboardRouter = Router();

const dashboardRepository = new PrismaDashboardRepository(prisma);
const dashboardUseCase = new DashboardUseCase(dashboardRepository);
const dashboardController = new DashboardController(dashboardUseCase);

dashboardRouter.use(isAuthenticated, hasRole([RoleNom.PROPRIETAIRE, RoleNom.GERANT, RoleNom.VENDEUR]));

dashboardRouter.get("/summary", (req, res) => dashboardController.getSummary(req, res));

export default dashboardRouter;
