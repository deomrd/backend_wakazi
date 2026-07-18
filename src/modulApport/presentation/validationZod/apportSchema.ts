import { MethodePaiement } from "@prisma/client";
import { z } from "zod";

const positiveAmount = z.coerce.number().positive("La valeur doit etre superieure a 0.");

export const createApportSchema = z.object({
  libelle: z.string().trim().min(2, "Le libelle doit contenir au moins 2 caracteres."),
  montant: positiveAmount,
  methodePaiement: z.nativeEnum(MethodePaiement),
  referencePaiement: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  dateApport: z.coerce.date().optional(),
});

export const createRetraitApportSchema = z.object({
  montant: positiveAmount,
  notes: z.string().trim().optional(),
  dateRetrait: z.coerce.date().optional(),
});
