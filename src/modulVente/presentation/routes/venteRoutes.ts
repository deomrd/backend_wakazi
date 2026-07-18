import { Router } from "express";
import { RoleNom } from "@prisma/client";
import { isAuthenticated, hasRole } from "../../../shared/security/authMiddleware";
import { PrismaVenteRepository } from "../../infrastructure/prismaRepository/prismaVenteRepository";
import { VenteUseCase } from "../../application/usecase/venteUsecase";
import { VenteController } from "../controller/venteController";
import { prisma } from "../../../config/db";

const venteRouter = Router();

const venteRepository = new PrismaVenteRepository(prisma);
const venteUseCase = new VenteUseCase(venteRepository);
const venteController = new VenteController(venteUseCase);

const canSell = [RoleNom.PROPRIETAIRE, RoleNom.GERANT, RoleNom.VENDEUR];
const canManageReturns = [RoleNom.PROPRIETAIRE, RoleNom.GERANT];

venteRouter.use(isAuthenticated, hasRole(canSell));

venteRouter.post("/clients", (req, res) => venteController.createClient(req, res));
venteRouter.get("/clients", (req, res) => venteController.listClients(req, res));

venteRouter.post("/", (req, res) => venteController.createVente(req, res));
venteRouter.get("/", (req, res) => venteController.listVentes(req, res));

venteRouter.get("/dettes/liste", (req, res) => venteController.listDettes(req, res));
venteRouter.post("/dettes/:id/paiements", (req, res) => venteController.payDette(req, res));

venteRouter.post("/:id/annulation", hasRole(canManageReturns), (req, res) => venteController.cancelVente(req, res));
venteRouter.post("/:id/remboursements", hasRole(canManageReturns), (req, res) => venteController.refundVente(req, res));
venteRouter.get("/:id/recu", (req, res) => venteController.getRecuVente(req, res));
venteRouter.get("/:id", (req, res) => venteController.getVenteById(req, res));

export default venteRouter;
