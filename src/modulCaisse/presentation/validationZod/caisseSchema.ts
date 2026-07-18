import { TypeMouvementCaisse } from "@prisma/client";
import { z } from "zod";

const money = z.coerce.number().nonnegative("Le montant ne peut pas être négatif.");
const positive = z.coerce.number().positive("Le montant doit être supérieur à 0.");
export const createCaisseSchema = z.object({ nom: z.string().trim().min(2) });
export const openSessionSchema = z.object({ caisseId: z.string().trim().min(1), fondOuverture: money, notesOuverture: z.string().trim().min(1).optional() });
export const closeSessionSchema = z.object({ montantReel: money, notesFermeture: z.string().trim().min(1).optional() });
export const mouvementSchema = z.object({ type: z.nativeEnum(TypeMouvementCaisse), montant: positive, libelle: z.string().trim().min(2), reference: z.string().trim().min(1).optional() });
export const validateSessionSchema = z.object({ approuve: z.boolean() });
