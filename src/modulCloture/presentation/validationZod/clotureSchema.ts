import { z } from "zod";

const nonNegativeAmount = z.coerce.number().nonnegative("Le montant ne peut pas etre negatif.");

export const previewClotureSchema = z.object({
  dateJournee: z.coerce.date().optional(),
  fondCaisseOuverture: nonNegativeAmount.optional(),
});

export const createClotureSchema = previewClotureSchema.extend({
  montantReelCaisse: nonNegativeAmount,
  notes: z.string().trim().optional(),
});
