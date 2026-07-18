import { CategorieDepense, MethodePaiement } from "@prisma/client";
import { z } from "zod";

const positiveAmount = z.coerce.number().positive("Le montant doit être supérieur à 0.");

export const createDepenseSchema = z.object({
  categorie: z.nativeEnum(CategorieDepense),
  libelle: z.string().trim().min(2, "Le libellé doit contenir au moins 2 caractères."),
  montant: positiveAmount,
  methodePaiement: z.nativeEnum(MethodePaiement),
  referencePaiement: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  dateDepense: z.coerce.date().optional(),
});

export const updateDepenseSchema = createDepenseSchema
  .partial()
  .extend({
    referencePaiement: z.string().trim().nullable().optional(),
    notes: z.string().trim().nullable().optional(),
  });
