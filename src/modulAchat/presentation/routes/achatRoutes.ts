import { RoleNom } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../../../config/db";
import { hasRole, isAuthenticated } from "../../../shared/security/authMiddleware";
import { AchatUseCase } from "../../application/usecase/achatUsecase";
import { PrismaAchatRepository } from "../../infrastructure/prismaRepository/prismaAchatRepository";
import { AchatController } from "../controller/achatController";

const router = Router();
const controller = new AchatController(new AchatUseCase(new PrismaAchatRepository(prisma)));
router.use(isAuthenticated, hasRole([RoleNom.PROPRIETAIRE, RoleNom.GERANT]));

router.post("/fournisseurs", (req, res) => controller.createFournisseur(req, res));
router.get("/fournisseurs", (req, res) => controller.listFournisseurs(req, res));
router.get("/fournisseurs/:id", (req, res) => controller.getFournisseur(req, res));
router.patch("/fournisseurs/:id", (req, res) => controller.updateFournisseur(req, res));
router.delete("/fournisseurs/:id", (req, res) => controller.deactivateFournisseur(req, res));
router.get("/dettes", (req, res) => controller.listDettes(req, res));
router.post("/dettes/:id/paiements", (req, res) => controller.payDette(req, res));
router.post("/", (req, res) => controller.createAchat(req, res));
router.get("/", (req, res) => controller.listAchats(req, res));
router.get("/:id", (req, res) => controller.getAchat(req, res));

export default router;
