import * as bcrypt from "bcrypt";
import { RoleNom } from "@prisma/client";
import {
  CreateEmployeEntity,
  EmployeeRoleNom,
  EmployeListFilter,
  EmployeWithDefaultPin,
  UpdateEmployeEntity,
} from "../../domaine/entity/employeEntity";
import { EmployeRepository } from "../../domaine/repository/employeRepository";
import { PaginationParams } from "../../../shared/pagination/pagination";

export class EmployeUseCase {
  constructor(private readonly employeRepository: EmployeRepository) {}

  async createEmploye(boutiqueId: string, employe: CreateEmployeEntity): Promise<EmployeWithDefaultPin> {
    this.ensureEmployeeRole(employe.roleNom);
    const boutiqueNom = await this.employeRepository.getBoutiqueNom(boutiqueId);
    const pinParDefaut = this.generateDefaultPin(boutiqueNom, employe.nomUtilisateur, employe.nom);
    const hashedPin = await bcrypt.hash(pinParDefaut, 10);
    const created = await this.employeRepository.createEmploye(boutiqueId, this.normalizeCreate(employe), hashedPin);

    return { employe: created, pinParDefaut };
  }

  listEmployes(boutiqueId: string, pagination: PaginationParams, filters: EmployeListFilter) {
    if (filters.roleNom) {
      this.ensureEmployeeRole(filters.roleNom);
    }

    return this.employeRepository.listEmployes(boutiqueId, pagination, filters);
  }

  getEmployeById(boutiqueId: string, userId: string) {
    return this.employeRepository.getEmployeById(boutiqueId, userId);
  }

  async updateEmploye(boutiqueId: string, userId: string, employe: UpdateEmployeEntity) {
    if (employe.roleNom) {
      this.ensureEmployeeRole(employe.roleNom);
    }

    return this.employeRepository.updateEmploye(boutiqueId, userId, this.normalizeUpdate(employe));
  }

  deactivateEmploye(boutiqueId: string, userId: string) {
    return this.employeRepository.setEmployeStatut(boutiqueId, userId, false);
  }

  reactivateEmploye(boutiqueId: string, userId: string) {
    return this.employeRepository.setEmployeStatut(boutiqueId, userId, true);
  }

  async resetPin(boutiqueId: string, userId: string): Promise<EmployeWithDefaultPin> {
    const employe = await this.employeRepository.getEmployeById(boutiqueId, userId);
    if (!employe?.nomUtilisateur) {
      throw new Error("Employe introuvable dans cette boutique.");
    }

    const boutiqueNom = await this.employeRepository.getBoutiqueNom(boutiqueId);
    const pinParDefaut = this.generateDefaultPin(boutiqueNom, employe.nomUtilisateur, employe.nom);
    const hashedPin = await bcrypt.hash(pinParDefaut, 10);
    const updated = await this.employeRepository.resetPin(boutiqueId, userId, hashedPin);

    return { employe: updated, pinParDefaut };
  }

  private ensureEmployeeRole(roleNom: RoleNom): void {
    if (!this.employeeRoles().includes(roleNom as EmployeeRoleNom)) {
      throw new Error("Seuls les roles GERANT et VENDEUR peuvent etre geres comme employes.");
    }
  }

  private employeeRoles(): EmployeeRoleNom[] {
    return ["GERANT", "VENDEUR"];
  }

  private normalizeCreate(employe: CreateEmployeEntity): CreateEmployeEntity {
    return {
      ...employe,
      nom: employe.nom.trim(),
      nomUtilisateur: employe.nomUtilisateur.trim().toLowerCase(),
      adresse: employe.adresse?.trim(),
    };
  }

  private normalizeUpdate(employe: UpdateEmployeEntity): UpdateEmployeEntity {
    return {
      ...employe,
      nom: employe.nom?.trim(),
      nomUtilisateur: employe.nomUtilisateur?.trim().toLowerCase(),
      adresse: employe.adresse === null ? null : employe.adresse?.trim(),
    };
  }

  private generateDefaultPin(boutiqueNom: string, nomUtilisateur: string, nom: string): string {
    const source = `${boutiqueNom}|${nomUtilisateur}|${nom}`.toLowerCase();
    let hash = 0;

    for (let i = 0; i < source.length; i += 1) {
      hash = (hash * 31 + source.charCodeAt(i)) % 10000;
    }

    return hash.toString().padStart(4, "0");
  }
}
