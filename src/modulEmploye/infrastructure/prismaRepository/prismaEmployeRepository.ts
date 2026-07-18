import { Prisma, PrismaClient } from "@prisma/client";
import {
  CreateEmployeEntity,
  EmployeeRoleNom,
  EmployeEntity,
  EmployeListFilter,
  UpdateEmployeEntity,
} from "../../domaine/entity/employeEntity";
import { EmployeRepository } from "../../domaine/repository/employeRepository";
import { getPaginationArgs, paginatedResult, PaginationParams } from "../../../shared/pagination/pagination";

type EmployeUserRoleRecord = Prisma.UserRoleGetPayload<{
  include: {
    User: true;
    Roles: true;
  };
}>;

export class PrismaEmployeRepository implements EmployeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  getEmployeRoleNames(): EmployeeRoleNom[] {
    return ["GERANT", "VENDEUR"];
  }

  async getBoutiqueNom(boutiqueId: string): Promise<string> {
    const boutique = await this.prisma.boutique.findUnique({
      where: { boutiqueId },
      select: { nom: true },
    });

    if (!boutique) {
      throw new Error("Boutique introuvable.");
    }

    return boutique.nom;
  }

  async createEmploye(boutiqueId: string, employe: CreateEmployeEntity, hashedPin: string): Promise<EmployeEntity> {
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.findUnique({ where: { nom: employe.roleNom } });
      if (!role) {
        throw new Error(`Role ${employe.roleNom} introuvable.`);
      }

      const created = await tx.user.create({
        data: {
          nom: employe.nom,
          nomUtilisateur: employe.nomUtilisateur,
          adresse: employe.adresse,
          telephone: null,
          motDePasse: hashedPin,
          statut: true,
          doitChangerPin: true,
          UserRoles: {
            create: {
              roleId: role.roleId,
              boutiqueId,
            },
          },
        },
        include: {
          UserRoles: {
            where: { boutiqueId },
            include: { Roles: true },
          },
        },
      });

      const context = created.UserRoles[0];
      return this.mapUser({
        User: created,
        Roles: context.Roles,
        boutiqueId,
      });
    });
  }

  async listEmployes(boutiqueId: string, pagination: PaginationParams, filters: EmployeListFilter) {
    const where: Prisma.UserRoleWhereInput = {
      boutiqueId,
      Roles: {
        nom: filters.roleNom ? filters.roleNom : { in: this.getEmployeRoleNames() },
      },
      User: {
        ...(filters.statut === undefined ? {} : { statut: filters.statut }),
        ...(filters.search ? {
          OR: [
            { nom: { contains: filters.search } },
            { nomUtilisateur: { contains: filters.search } },
            { adresse: { contains: filters.search } },
          ],
        } : {}),
      },
    };

    const [userRoles, total] = await this.prisma.$transaction([
      this.prisma.userRole.findMany({
        where,
        include: {
          User: true,
          Roles: true,
        },
        orderBy: { createdAt: "desc" },
        ...getPaginationArgs(pagination),
      }),
      this.prisma.userRole.count({ where }),
    ]);

    return paginatedResult(userRoles.map((userRole) => this.mapUserRole(userRole)), total, pagination);
  }

  async getEmployeById(boutiqueId: string, userId: string): Promise<EmployeEntity | null> {
    const userRole = await this.findEmployeeUserRole(boutiqueId, userId);
    return userRole ? this.mapUserRole(userRole) : null;
  }

  async updateEmploye(boutiqueId: string, userId: string, employe: UpdateEmployeEntity): Promise<EmployeEntity> {
    await this.ensureEmployeInBoutique(boutiqueId, userId);

    return this.prisma.$transaction(async (tx) => {
      if (employe.roleNom) {
        const role = await tx.role.findUnique({ where: { nom: employe.roleNom } });
        if (!role) {
          throw new Error(`Role ${employe.roleNom} introuvable.`);
        }

        await tx.userRole.updateMany({
          where: {
            boutiqueId,
            userId,
            Roles: { nom: { in: this.getEmployeRoleNames() } },
          },
          data: { roleId: role.roleId },
        });
      }

      await tx.user.update({
        where: { userId },
        data: {
          nom: employe.nom,
          nomUtilisateur: employe.nomUtilisateur,
          adresse: employe.adresse,
          ...(employe.roleNom ? { authVersion: { increment: 1 } } : {}),
        },
      });

      const updated = await tx.userRole.findFirst({
        where: {
          boutiqueId,
          userId,
          Roles: { nom: { in: this.getEmployeRoleNames() } },
        },
        include: {
          User: true,
          Roles: true,
        },
      });

      if (!updated) {
        throw new Error("Employe introuvable dans cette boutique.");
      }

      return this.mapUserRole(updated);
    });
  }

  async setEmployeStatut(boutiqueId: string, userId: string, statut: boolean): Promise<EmployeEntity> {
    await this.ensureEmployeInBoutique(boutiqueId, userId);
    await this.prisma.user.update({
      where: { userId },
      data: { statut, authVersion: { increment: 1 } },
    });

    const updated = await this.findEmployeeUserRole(boutiqueId, userId);
    if (!updated) {
      throw new Error("Employe introuvable dans cette boutique.");
    }

    return this.mapUserRole(updated);
  }

  async resetPin(boutiqueId: string, userId: string, hashedPin: string): Promise<EmployeEntity> {
    await this.ensureEmployeInBoutique(boutiqueId, userId);
    await this.prisma.user.update({
      where: { userId },
      data: {
        motDePasse: hashedPin,
        doitChangerPin: true,
        authVersion: { increment: 1 },
      },
    });

    const updated = await this.findEmployeeUserRole(boutiqueId, userId);
    if (!updated) {
      throw new Error("Employe introuvable dans cette boutique.");
    }

    return this.mapUserRole(updated);
  }

  private async ensureEmployeInBoutique(boutiqueId: string, userId: string): Promise<void> {
    const userRole = await this.findEmployeeUserRole(boutiqueId, userId);
    if (!userRole) {
      throw new Error("Employe introuvable dans cette boutique.");
    }
  }

  private findEmployeeUserRole(boutiqueId: string, userId: string): Promise<EmployeUserRoleRecord | null> {
    return this.prisma.userRole.findFirst({
      where: {
        boutiqueId,
        userId,
        Roles: { nom: { in: this.getEmployeRoleNames() } },
      },
      include: {
        User: true,
        Roles: true,
      },
    });
  }

  private mapUserRole(userRole: EmployeUserRoleRecord): EmployeEntity {
    return this.mapUser({
      User: userRole.User,
      Roles: userRole.Roles,
      boutiqueId: userRole.boutiqueId,
    });
  }

  private mapUser(record: { User: EmployeUserRoleRecord["User"]; Roles: EmployeUserRoleRecord["Roles"]; boutiqueId: string }): EmployeEntity {
    return {
      userId: record.User.userId,
      nom: record.User.nom,
      nomUtilisateur: record.User.nomUtilisateur,
      adresse: record.User.adresse,
      statut: record.User.statut,
      roleNom: record.Roles.nom,
      boutiqueId: record.boutiqueId,
      createdAt: record.User.createdAt,
      updatedAt: record.User.updatedAt,
    };
  }
}
