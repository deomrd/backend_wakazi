import { z } from "zod";
import { APP_MESSAGES } from "../../../shared/errorMessages/errorMessages";

const employeeRoleSchema = z.enum(["GERANT", "VENDEUR"], "Le role doit etre GERANT ou VENDEUR.");

export const createEmployeSchema = z.object({
  nom: z.string(APP_MESSAGES.VALIDATION.REQUIRED_FIELD("nom complet")).trim().min(2),
  nomUtilisateur: z.string(APP_MESSAGES.VALIDATION.REQUIRED_FIELD("nom d'utilisateur")).trim().min(3),
  adresse: z.string().trim().optional(),
  roleNom: employeeRoleSchema,
});

export const updateEmployeSchema = z
  .object({
    nom: z.string().trim().min(2).optional(),
    nomUtilisateur: z.string().trim().min(3).optional(),
    adresse: z.string().trim().nullable().optional(),
    roleNom: employeeRoleSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Aucune donnee a modifier.",
  });
