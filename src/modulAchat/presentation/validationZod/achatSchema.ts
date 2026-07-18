import { MethodePaiement } from "@prisma/client";
import { z } from "zod";

const positive = z.coerce.number().positive("La valeur doit être supérieure à 0.");
const nonNegative = z.coerce.number().nonnegative("La valeur ne peut pas être négative.");
const optionalText = z.string().trim().min(1).optional();

export const createFournisseurSchema = z.object({
  nom: z.string().trim().min(2, "Le nom du fournisseur doit contenir au moins 2 caractères."),
  telephone: z.string().trim().regex(/^\d{9,15}$/, "Le numéro de téléphone est invalide.").optional(),
  email: z.string().trim().email("L'adresse e-mail est invalide.").optional(),
  adresse: optionalText,
  notes: optionalText,
});

export const updateFournisseurSchema = createFournisseurSchema.partial().extend({
  statut: z.coerce.boolean().optional(),
});

export const createAchatSchema = z.object({
  fournisseurId: optionalText,
  montantPaye: nonNegative.optional().default(0),
  methodePaiement: z.nativeEnum(MethodePaiement).optional().default(MethodePaiement.ESPECES),
  reference: optionalText,
  notes: optionalText,
  dateEcheance: z.coerce.date().optional(),
  lignes: z.array(z.object({
    produitId: z.string().trim().min(1, "Le produit est obligatoire."),
    quantite: positive,
    prixAchat: nonNegative,
  })).min(1, "Un achat doit contenir au moins une ligne."),
}).superRefine((data, ctx) => {
  const seen = new Set<string>();
  data.lignes.forEach((ligne, index) => {
    if (seen.has(ligne.produitId)) {
      ctx.addIssue({ code: "custom", path: ["lignes", index, "produitId"], message: "Un produit ne peut apparaître qu'une seule fois dans un achat." });
    }
    seen.add(ligne.produitId);
  });
});

export const payDetteFournisseurSchema = z.object({
  montant: positive,
  methode: z.nativeEnum(MethodePaiement),
  reference: optionalText,
});
