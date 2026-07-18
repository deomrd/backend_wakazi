import { PaginatedResult, PaginationParams } from "../../../shared/pagination/pagination";
import { CloseSessionEntity, CreateMouvementEntity, OpenSessionEntity, SessionListFilter, ValidateSessionEntity } from "../entity/caisseEntity";

export interface CaisseRepository {
  createCaisse(boutiqueId: string, nom: string): Promise<unknown>;
  listCaisses(boutiqueId: string): Promise<unknown[]>;
  openSession(boutiqueId: string, data: OpenSessionEntity): Promise<unknown>;
  getOpenSession(boutiqueId: string, caisseId?: string): Promise<unknown | null>;
  createMouvement(boutiqueId: string, data: CreateMouvementEntity): Promise<unknown>;
  previewSession(boutiqueId: string, sessionCaisseId: string): Promise<unknown>;
  closeSession(boutiqueId: string, data: CloseSessionEntity): Promise<unknown>;
  validateSession(boutiqueId: string, data: ValidateSessionEntity): Promise<unknown>;
  listSessions(boutiqueId: string, pagination: PaginationParams, filters: SessionListFilter): Promise<PaginatedResult<unknown>>;
}
