import { Router } from "express";
import { RoleNom } from "@prisma/client";
import { prisma } from "../../../config/db";
import { isAuthenticated, hasRole } from "../../../shared/security/authMiddleware";
import { PrismaParametreBoutiqueRepository } from "../../infrastructure/prismaRepository/prismaParametreBoutiqueRepository";
import { ParametreBoutiqueUseCase } from "../../application/usecase/parametreBoutiqueUsecase";
import { ParametreBoutiqueController } from "../controller/parametreBoutiqueController";

const parametreBoutiqueRouter = Router();

const parametreBoutiqueRepository = new PrismaParametreBoutiqueRepository(prisma);
const parametreBoutiqueUseCase = new ParametreBoutiqueUseCase(parametreBoutiqueRepository);
const parametreBoutiqueController = new ParametreBoutiqueController(parametreBoutiqueUseCase);

const canViewBoutiqueSettings = [RoleNom.PROPRIETAIRE, RoleNom.GERANT, RoleNom.VENDEUR];
const canManageBoutiqueSettings = [RoleNom.PROPRIETAIRE];

parametreBoutiqueRouter.use(isAuthenticated);

parametreBoutiqueRouter.get("/", hasRole(canViewBoutiqueSettings), (req, res) => parametreBoutiqueController.getBoutique(req, res));
parametreBoutiqueRouter.patch("/nom", hasRole(canManageBoutiqueSettings), (req, res) => parametreBoutiqueController.updateNom(req, res));
parametreBoutiqueRouter.patch("/adresse", hasRole(canManageBoutiqueSettings), (req, res) => parametreBoutiqueController.updateAdresse(req, res));
parametreBoutiqueRouter.patch("/devise", hasRole(canManageBoutiqueSettings), (req, res) => parametreBoutiqueController.updateDevise(req, res));
parametreBoutiqueRouter.patch("/devise-secondaire", hasRole(canManageBoutiqueSettings), (req, res) => parametreBoutiqueController.updateDeviseSecondaire(req, res));
parametreBoutiqueRouter.patch("/taux-devise-secondaire", hasRole(canManageBoutiqueSettings), (req, res) => parametreBoutiqueController.updateTauxDeviseSecondaire(req, res));
parametreBoutiqueRouter.patch("/rccm", hasRole(canManageBoutiqueSettings), (req, res) => parametreBoutiqueController.updateRccm(req, res));
parametreBoutiqueRouter.patch("/type-entreprise", hasRole(canManageBoutiqueSettings), (req, res) => parametreBoutiqueController.updateTypeEntreprise(req, res));

export default parametreBoutiqueRouter;
