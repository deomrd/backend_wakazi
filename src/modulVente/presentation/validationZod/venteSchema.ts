import { MethodePaiement } from "@prisma/client";
import { z } from "zod";

const positiveAmount = z.coerce.number().positive("La valeur doit être supérieure à 0.");
const nonNegativeAmount = z.coerce.number().nonnegative("La valeur ne peut pas être négative.");

export const createClientSchema = z.object({
  nom: z.string().trim().min(2, "Le nom du client doit contenir au moins 2 caractères."),
  telephone: z.string().trim().regex(/^\d{9,15}$/, "Le numéro de téléphone est invalide.").optional(),
});

export const createVenteSchema = z.object({
  clientId: z.string().trim().optional(),
  montantPaye: nonNegativeAmount.optional(),
  montantPayeDevisePaiement: nonNegativeAmount.optional(),
  devisePaiement: z.string().trim().min(2).max(6).optional(),
  methodePaiement: z.nativeEnum(MethodePaiement).optional().default(MethodePaiement.ESPECES),
  lignes: z
    .array(
      z.object({
        produitId: z.string().trim().min(1, "Le produit est obligatoire."),
        quantite: positiveAmount,
        prixUnitaire: positiveAmount.optional(),
      })
    )
    .min(1, "Une vente doit contenir au moins une ligne."),
}).superRefine((data, ctx) => {
  const seen = new Set<string>();
  data.lignes.forEach((ligne, index) => {
    if (seen.has(ligne.produitId)) {
      ctx.addIssue({ code: "custom", path: ["lignes", index, "produitId"], message: "Un produit ne peut apparaître qu'une seule fois dans une vente." });
    }
    seen.add(ligne.produitId);
  });
});

export const payDetteSchema = z.object({
  montant: positiveAmount,
  montantDevisePaiement: positiveAmount.optional(),
  devisePaiement: z.string().trim().min(2).max(6).optional(),
  methode: z.nativeEnum(MethodePaiement),
});

export const cancelVenteSchema = z.object({
  motif: z.string().trim().min(3, "Le motif doit contenir au moins 3 caractères."),
});

export const refundVenteSchema = z.object({
  motif: z.string().trim().min(3, "Le motif doit contenir au moins 3 caractères."),
  methode: z.nativeEnum(MethodePaiement),
  lignes: z.array(z.object({
    produitId: z.string().trim().min(1, "Le produit est obligatoire."),
    quantite: positiveAmount,
  })).min(1, "Le remboursement doit contenir au moins une ligne."),
}).superRefine((data, ctx) => {
  const seen = new Set<string>();
  data.lignes.forEach((ligne, index) => {
    if (seen.has(ligne.produitId)) {
      ctx.addIssue({ code: "custom", path: ["lignes", index, "produitId"], message: "Un produit ne peut apparaître qu'une seule fois dans un remboursement." });
    }
    seen.add(ligne.produitId);
  });
});
