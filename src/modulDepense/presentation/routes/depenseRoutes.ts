import { Router } from "express";
import { RoleNom } from "@prisma/client";
import { isAuthenticated, hasRole } from "../../../shared/security/authMiddleware";
import { PrismaDepenseRepository } from "../../infrastructure/prismaRepository/prismaDepenseRepository";
import { DepenseUseCase } from "../../application/usecase/depenseUsecase";
import { DepenseController } from "../controller/depenseController";
import { prisma } from "../../../config/db";

const depenseRouter = Router();

const depenseRepository = new PrismaDepenseRepository(prisma);
const depenseUseCase = new DepenseUseCase(depenseRepository);
const depenseController = new DepenseController(depenseUseCase);

const canManageExpenses = [RoleNom.PROPRIETAIRE, RoleNom.GERANT, RoleNom.VENDEUR];

depenseRouter.use(isAuthenticated, hasRole(canManageExpenses));

depenseRouter.post("/", (req, res) => depenseController.createDepense(req, res));
depenseRouter.get("/", (req, res) => depenseController.listDepenses(req, res));
depenseRouter.get("/:id", (req, res) => depenseController.getDepenseById(req, res));
depenseRouter.patch("/:id", (req, res) => depenseController.updateDepense(req, res));
depenseRouter.delete("/:id", (req, res) => depenseController.deleteDepense(req, res));

export default depenseRouter;
