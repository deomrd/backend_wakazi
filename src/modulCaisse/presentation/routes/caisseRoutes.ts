import { RoleNom } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../../../config/db";
import { hasRole, isAuthenticated } from "../../../shared/security/authMiddleware";
import { CaisseUseCase } from "../../application/usecase/caisseUsecase";
import { PrismaCaisseRepository } from "../../infrastructure/prismaRepository/prismaCaisseRepository";
import { CaisseController } from "../controller/caisseController";

const router = Router();
const controller = new CaisseController(new CaisseUseCase(new PrismaCaisseRepository(prisma)));
const managers = [RoleNom.PROPRIETAIRE, RoleNom.GERANT];
const operators = [RoleNom.PROPRIETAIRE, RoleNom.GERANT, RoleNom.VENDEUR];
router.use(isAuthenticated);
router.post("/", hasRole(managers), (req, res) => controller.createCaisse(req, res));
router.get("/", hasRole(operators), (req, res) => controller.listCaisses(req, res));
router.post("/sessions/ouvrir", hasRole(operators), (req, res) => controller.open(req, res));
router.get("/sessions/ouverte", hasRole(operators), (req, res) => controller.current(req, res));
router.get("/sessions", hasRole(managers), (req, res) => controller.listSessions(req, res));
router.post("/sessions/:id/mouvements", hasRole(operators), (req, res) => controller.movement(req, res));
router.get("/sessions/:id/preview", hasRole(operators), (req, res) => controller.preview(req, res));
router.post("/sessions/:id/fermer", hasRole(operators), (req, res) => controller.close(req, res));
router.post("/sessions/:id/valider", hasRole(managers), (req, res) => controller.validate(req, res));

export default router;
