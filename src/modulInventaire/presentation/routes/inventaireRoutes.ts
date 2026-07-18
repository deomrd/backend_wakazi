import { RoleNom } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../../../config/db";
import { hasRole, isAuthenticated } from "../../../shared/security/authMiddleware";
import { InventaireUseCase } from "../../application/usecase/inventaireUsecase";
import { PrismaInventaireRepository } from "../../infrastructure/prismaRepository/prismaInventaireRepository";
import { InventaireController } from "../controller/inventaireController";

const router = Router();
const controller = new InventaireController(new InventaireUseCase(new PrismaInventaireRepository(prisma)));
router.use(isAuthenticated, hasRole([RoleNom.PROPRIETAIRE, RoleNom.GERANT]));
router.post("/", (req, res) => controller.create(req, res));
router.get("/", (req, res) => controller.list(req, res));
router.get("/:id", (req, res) => controller.get(req, res));

export default router;
