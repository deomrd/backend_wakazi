import {
  CreateEmployeEntity,
  EmployeEntity,
  EmployeeRoleNom,
  EmployeListFilter,
  UpdateEmployeEntity,
} from "../entity/employeEntity";
import { PaginatedResult, PaginationParams } from "../../../shared/pagination/pagination";

export interface EmployeRepository {
  getBoutiqueNom(boutiqueId: string): Promise<string>;
  createEmploye(boutiqueId: string, employe: CreateEmployeEntity, hashedPin: string): Promise<EmployeEntity>;
  listEmployes(
    boutiqueId: string,
    pagination: PaginationParams,
    filters: EmployeListFilter
  ): Promise<PaginatedResult<EmployeEntity>>;
  getEmployeById(boutiqueId: string, userId: string): Promise<EmployeEntity | null>;
  updateEmploye(boutiqueId: string, userId: string, employe: UpdateEmployeEntity): Promise<EmployeEntity>;
  setEmployeStatut(boutiqueId: string, userId: string, statut: boolean): Promise<EmployeEntity>;
  resetPin(boutiqueId: string, userId: string, hashedPin: string): Promise<EmployeEntity>;
  getEmployeRoleNames(): EmployeeRoleNom[];
}
