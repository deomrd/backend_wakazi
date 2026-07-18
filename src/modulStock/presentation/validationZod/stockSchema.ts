import { TypeStock, UniteMesure } from "@prisma/client";
import { z } from "zod";

const positiveAmount = z.coerce.number().positive("La valeur doit être supérieure à 0.");
const nonNegativeAmount = z.coerce.number().nonnegative("La valeur ne peut pas être négative.");

export const categorieSchema = z.object({
  nom: z.string().trim().min(2, "Le nom de la catégorie doit contenir au moins 2 caractères."),
});

export const createProduitSchema = z.object({
  nom: z.string().trim().min(2, "Le nom du produit doit contenir au moins 2 caractères."),
  description: z.string().trim().optional(),
  photo: z.string().trim().optional(),
  prixAchat: nonNegativeAmount,
  prixVente: positiveAmount,
  stockActuel: nonNegativeAmount.optional(),
  dateExpiration: z.coerce.date().optional(),
  codeQR: z.string().trim().min(2, "Le code QR doit contenir au moins 2 caractères.").optional(),
  uniteMesure: z.nativeEnum(UniteMesure).optional(),
  categorieId: z.string().trim().optional(),
});

export const updateProduitSchema = createProduitSchema
  .partial()
  .extend({
    description: z.string().trim().nullable().optional(),
    photo: z.string().trim().nullable().optional(),
    dateExpiration: z.coerce.date().nullable().optional(),
    categorieId: z.string().trim().nullable().optional(),
  });

export const stockMovementSchema = z.object({
  produitId: z.string().trim().min(1, "Le produit est obligatoire."),
  type: z.nativeEnum(TypeStock),
  quantite: positiveAmount,
  raison: z.string().trim().optional(),
});

export const ravitaillementSchema = z.object({
  quantite: positiveAmount,
  prixAchatUnitaire: nonNegativeAmount.optional(),
  fournisseur: z.string().trim().optional(),
  numeroReference: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
