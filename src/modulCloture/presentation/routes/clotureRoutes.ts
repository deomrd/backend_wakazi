import { Router } from "express";
import { RoleNom } from "@prisma/client";
import { isAuthenticated, hasRole } from "../../../shared/security/authMiddleware";
import { PrismaClotureRepository } from "../../infrastructure/prismaRepository/prismaClotureRepository";
import { ClotureUseCase } from "../../application/usecase/clotureUsecase";
import { ClotureController } from "../controller/clotureController";
import { prisma } from "../../../config/db";

const clotureRouter = Router();

const clotureRepository = new PrismaClotureRepository(prisma);
const clotureUseCase = new ClotureUseCase(clotureRepository);
const clotureController = new ClotureController(clotureUseCase);

clotureRouter.use(isAuthenticated, hasRole([RoleNom.PROPRIETAIRE, RoleNom.GERANT]));

clotureRouter.get("/preview", (req, res) => clotureController.previewClotureJournee(req, res));
clotureRouter.post("/", (req, res) => clotureController.createClotureJournee(req, res));
clotureRouter.get("/", (req, res) => clotureController.listCloturesJournee(req, res));
clotureRouter.get("/:id", (req, res) => clotureController.getClotureJourneeById(req, res));

export default clotureRouter;
