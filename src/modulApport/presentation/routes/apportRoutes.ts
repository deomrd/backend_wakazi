import { Router } from "express";
import { RoleNom } from "@prisma/client";
import { prisma } from "../../../config/db";
import { isAuthenticated, hasRole } from "../../../shared/security/authMiddleware";
import { PrismaApportRepository } from "../../infrastructure/prismaRepository/prismaApportRepository";
import { ApportUseCase } from "../../application/usecase/apportUsecase";
import { ApportController } from "../controller/apportController";

const apportRouter = Router();

const apportRepository = new PrismaApportRepository(prisma);
const apportUseCase = new ApportUseCase(apportRepository);
const apportController = new ApportController(apportUseCase);

const canManageApports = [RoleNom.PROPRIETAIRE, RoleNom.GERANT];

apportRouter.use(isAuthenticated, hasRole(canManageApports));

apportRouter.post("/", (req, res) => apportController.createApport(req, res));
apportRouter.get("/", (req, res) => apportController.listApports(req, res));
apportRouter.get("/:id", (req, res) => apportController.getApportById(req, res));
apportRouter.post("/:id/retraits", (req, res) => apportController.createRetrait(req, res));

export default apportRouter;
