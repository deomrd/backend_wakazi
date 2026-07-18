import { Router } from "express";
import { RoleNom } from "@prisma/client";
import { isAuthenticated, hasRole } from "../../../shared/security/authMiddleware";
import { PrismaStockRepository } from "../../infrastructure/prismaRepository/prismaStockRepository";
import { StockUseCase } from "../../application/usecase/stockUsecase";
import { StockController } from "../controller/stockController";
import { prisma } from "../../../config/db";

const stockRouter = Router();

const stockRepository = new PrismaStockRepository(prisma);
const stockUseCase = new StockUseCase(stockRepository);
const stockController = new StockController(stockUseCase);

const canViewStock = [RoleNom.PROPRIETAIRE, RoleNom.GERANT, RoleNom.VENDEUR];
const canManageStock = [RoleNom.PROPRIETAIRE, RoleNom.GERANT];

stockRouter.use(isAuthenticated);

stockRouter.post("/categories", hasRole(canManageStock), (req, res) => stockController.createCategorie(req, res));
stockRouter.get("/categories", hasRole(canViewStock), (req, res) => stockController.listCategories(req, res));

stockRouter.post("/produits", hasRole(canManageStock), (req, res) => stockController.createProduit(req, res));
stockRouter.get("/produits", hasRole(canViewStock), (req, res) => stockController.listProduits(req, res));
stockRouter.get("/produits/qr/:codeQR", hasRole(canViewStock), (req, res) => stockController.getProduitByCodeQR(req, res));
stockRouter.get("/produits/:id", hasRole(canViewStock), (req, res) => stockController.getProduitById(req, res));
stockRouter.patch("/produits/:id", hasRole(canManageStock), (req, res) => stockController.updateProduit(req, res));
stockRouter.delete("/produits/:id", hasRole(canManageStock), (req, res) => stockController.deleteProduit(req, res));
stockRouter.post("/produits/:id/ravitaillements", hasRole(canManageStock), (req, res) => stockController.createRavitaillement(req, res));

stockRouter.post("/mouvements", hasRole(canManageStock), (req, res) => stockController.createStockMovement(req, res));
stockRouter.get("/mouvements", hasRole(canManageStock), (req, res) => stockController.listStockMovements(req, res));

stockRouter.get("/ravitaillements", hasRole(canManageStock), (req, res) => stockController.listRavitaillements(req, res));

export default stockRouter;
