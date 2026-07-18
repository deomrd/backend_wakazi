import { PaginationParams } from "../../../shared/pagination/pagination";
import { CloseSessionEntity, CreateMouvementEntity, OpenSessionEntity, SessionListFilter, ValidateSessionEntity } from "../../domaine/entity/caisseEntity";
import { CaisseRepository } from "../../domaine/repository/caisseRepository";

export class CaisseUseCase {
  constructor(private readonly repository: CaisseRepository) {}
  createCaisse(boutiqueId: string, nom: string) { return this.repository.createCaisse(boutiqueId, nom); }
  listCaisses(boutiqueId: string) { return this.repository.listCaisses(boutiqueId); }
  openSession(boutiqueId: string, data: OpenSessionEntity) { return this.repository.openSession(boutiqueId, data); }
  getOpenSession(boutiqueId: string, caisseId?: string) { return this.repository.getOpenSession(boutiqueId, caisseId); }
  createMouvement(boutiqueId: string, data: CreateMouvementEntity) { return this.repository.createMouvement(boutiqueId, data); }
  previewSession(boutiqueId: string, sessionCaisseId: string) { return this.repository.previewSession(boutiqueId, sessionCaisseId); }
  closeSession(boutiqueId: string, data: CloseSessionEntity) { return this.repository.closeSession(boutiqueId, data); }
  validateSession(boutiqueId: string, data: ValidateSessionEntity) { return this.repository.validateSession(boutiqueId, data); }
  listSessions(boutiqueId: string, pagination: PaginationParams, filters: SessionListFilter) { return this.repository.listSessions(boutiqueId, pagination, filters); }
}
