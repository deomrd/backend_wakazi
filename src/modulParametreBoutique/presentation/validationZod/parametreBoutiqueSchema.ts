import { TypeEntreprise } from "@prisma/client";
import { z } from "zod";
import { APP_MESSAGES } from "../../../shared/errorMessages/errorMessages";

export const updateBoutiqueNomSchema = z.object({
  nom: z.string(APP_MESSAGES.VALIDATION.REQUIRED_FIELD("nom boutique")).trim().min(2),
});

export const updateBoutiqueAdresseSchema = z.object({
  adresse: z.string().trim().min(1).nullable(),
});

export const updateBoutiqueDeviseSchema = z.object({
  devise: z.string(APP_MESSAGES.VALIDATION.REQUIRED_FIELD("devise")).trim().min(2).max(6),
});

export const updateBoutiqueDeviseSecondaireSchema = z.object({
  deviseSecondaire: z.string().trim().min(2).max(6).nullable(),
});

export const updateBoutiqueTauxDeviseSecondaireSchema = z.object({
  tauxDeviseSecondaire: z.coerce.number().positive().nullable(),
});

export const updateBoutiqueRccmSchema = z.object({
  RCCM: z.string().trim().min(1).nullable(),
});

export const updateBoutiqueTypeEntrepriseSchema = z.object({
  typeEntreprise: z.enum(Object.values(TypeEntreprise) as [string, ...string[]], APP_MESSAGES.VALIDATION.INVALID_ENUM),
});
