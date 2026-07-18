import { z } from "zod";
import { TypeEntreprise } from "@prisma/client";
import { APP_MESSAGES } from "../../../shared/errorMessages/errorMessages";

/**
 * Schéma de validation professionnel pour l'inscription.
 * Il garantit que les données correspondent exactement à ce que le Use Case attend.
 */
export const signupSchema = z.object({
  nom: z.string(APP_MESSAGES.VALIDATION.REQUIRED_FIELD("nom"))
    .min(2, APP_MESSAGES.VALIDATION.REQUIRED_FIELD("nom")),
  telephone: z
    .string(APP_MESSAGES.VALIDATION.REQUIRED_FIELD("téléphone"))
    .min(1, APP_MESSAGES.VALIDATION.REQUIRED_FIELD("téléphone"))
    .regex(/^\d{9,15}$/, APP_MESSAGES.VALIDATION.INVALID_PHONE),
  // Validation stricte du code PIN à 4 chiffres
  motDePasse: z.string(APP_MESSAGES.VALIDATION.REQUIRED_FIELD("mot de passe"))
    .length(4, APP_MESSAGES.VALIDATION.INVALID_PIN)
    .regex(/^\d+$/, "Le mot de passe ne doit contenir que des chiffres."),
  nomBoutique: z.string(APP_MESSAGES.VALIDATION.REQUIRED_FIELD("nom de la boutique"))
    .min(2, APP_MESSAGES.VALIDATION.REQUIRED_FIELD("nom de la boutique")),
  typeEntreprise: z.enum(Object.values(TypeEntreprise) as [string, ...string[]], { // Utilise Object.values pour obtenir un tableau de chaînes
    // errorMap est la propriété correcte pour les messages d'erreur personnalisés avec z.enum(string[])
    // Nous utilisons 'any' pour les types de paramètres 'issue' et '_ctx' pour éviter les problèmes d'importation de types internes de Zod.
    errorMap: (issue: any, _ctx: any) => {
      if (issue.code === "invalid_type") {
        return { message: APP_MESSAGES.VALIDATION.REQUIRED_FIELD("type d'entreprise") };
      }
      return { message: APP_MESSAGES.VALIDATION.INVALID_ENUM };
    },
  } as any), 
  devise: z.string().optional().default("USD"),
  deviseSecondaire: z.string().trim().min(2).max(6).optional(),
  tauxDeviseSecondaire: z.coerce.number().positive().optional(),
  adresseBoutique: z.string().optional(),
  RCCM: z.string().optional(),
});
