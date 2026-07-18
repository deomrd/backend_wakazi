import { Router } from "express";
import { RoleNom } from "@prisma/client";
import { prisma } from "../../../config/db";
import { isAuthenticated, hasRole } from "../../../shared/security/authMiddleware";
import { PrismaEmployeRepository } from "../../infrastructure/prismaRepository/prismaEmployeRepository";
import { EmployeUseCase } from "../../application/usecase/employeUsecase";
import { EmployeController } from "../controller/employeController";

const employeRouter = Router();

const employeRepository = new PrismaEmployeRepository(prisma);
const employeUseCase = new EmployeUseCase(employeRepository);
const employeController = new EmployeController(employeUseCase);

employeRouter.use(isAuthenticated, hasRole([RoleNom.PROPRIETAIRE]));

employeRouter.get("/", (req, res) => employeController.listEmployes(req, res));
employeRouter.post("/", (req, res) => employeController.createEmploye(req, res));
employeRouter.get("/:id", (req, res) => employeController.getEmployeById(req, res));
employeRouter.patch("/:id", (req, res) => employeController.updateEmploye(req, res));
employeRouter.patch("/:id/desactiver", (req, res) => employeController.deactivateEmploye(req, res));
employeRouter.patch("/:id/reactiver", (req, res) => employeController.reactivateEmploye(req, res));
employeRouter.post("/:id/reset-pin", (req, res) => employeController.resetPin(req, res));

export default employeRouter;
