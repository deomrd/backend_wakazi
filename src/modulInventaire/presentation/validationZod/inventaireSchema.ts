import { z } from "zod";

export const createInventaireSchema = z.object({
  notes: z.string().trim().min(1).optional(),
  lignes: z.array(z.object({
    produitId: z.string().trim().min(1, "Le produit est obligatoire."),
    quantiteComptee: z.coerce.number().nonnegative("La quantité comptée ne peut pas être négative."),
  })).min(1, "Un inventaire doit contenir au moins un produit."),
}).superRefine((data, ctx) => {
  const seen = new Set<string>();
  data.lignes.forEach((ligne, index) => {
    if (seen.has(ligne.produitId)) {
      ctx.addIssue({ code: "custom", path: ["lignes", index, "produitId"], message: "Un produit ne peut apparaître qu'une seule fois dans un inventaire." });
    }
    seen.add(ligne.produitId);
  });
});
