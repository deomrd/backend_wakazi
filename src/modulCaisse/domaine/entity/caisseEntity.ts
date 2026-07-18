import { StatutSessionCaisse, TypeMouvementCaisse } from "@prisma/client";
import { DateRangeFilter } from "../../../shared/filters/queryFilters";

export interface OpenSessionEntity { caisseId: string; userId: string; fondOuverture: number; notesOuverture?: string; }
export interface CloseSessionEntity { sessionCaisseId: string; userId: string; montantReel: number; notesFermeture?: string; }
export interface CreateMouvementEntity { sessionCaisseId: string; userId: string; type: TypeMouvementCaisse; montant: number; libelle: string; reference?: string; }
export interface ValidateSessionEntity { sessionCaisseId: string; userId: string; approuve: boolean; }
export interface SessionListFilter extends DateRangeFilter { caisseId?: string; statut?: StatutSessionCaisse; }
