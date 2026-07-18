import { Prisma, PrismaClient } from "@prisma/client";
import { SigninRepository } from "../../domaine/repository/signinRepository";
import { AuthenticatedUserEntity } from "../../domaine/entity/authenticatedUserEntity";

type AuthUserRecord = Prisma.UserGetPayload<{
  include: {
    UserRoles: {
      include: {
        Roles: true;
        Boutiques: true;
      };
    };
  };
}>;

export class PrismaSigninRepository implements SigninRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByLogin(login: { telephone?: string; nomUtilisateur?: string }): Promise<AuthenticatedUserEntity | null> {
    if (!login.telephone && !login.nomUtilisateur) {
      return null;
    }

    const user = await this.prisma.user.findFirst({
      where: login.telephone
        ? { telephone: login.telephone }
        : { nomUtilisateur: login.nomUtilisateur },
      include: {
        UserRoles: {
          orderBy: { createdAt: "asc" },
          include: {
            Roles: true,
            Boutiques: true,
          },
        },
      },
    });

    return user ? this.mapAuthenticatedUser(user) : null;
  }

  async findById(userId: string): Promise<AuthenticatedUserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      include: {
        UserRoles: {
          orderBy: { createdAt: "asc" },
          include: {
            Roles: true,
            Boutiques: true,
          },
        },
      },
    });

    return user ? this.mapAuthenticatedUser(user) : null;
  }

  async changePin(userId: string, hashedPin: string): Promise<AuthenticatedUserEntity> {
    const user = await this.prisma.user.update({
      where: { userId },
      data: {
        motDePasse: hashedPin,
        doitChangerPin: false,
        authVersion: { increment: 1 },
      },
      include: {
        UserRoles: {
          orderBy: { createdAt: "asc" },
          include: {
            Roles: true,
            Boutiques: true,
          },
        },
      },
    });
    return this.mapAuthenticatedUser(user);
  }

  async changeUsername(userId: string, nomUtilisateur: string): Promise<AuthenticatedUserEntity> {
    const user = await this.prisma.user.update({
      where: { userId },
      data: { nomUtilisateur },
      include: {
        UserRoles: {
          orderBy: { createdAt: "asc" },
          include: {
            Roles: true,
            Boutiques: true,
          },
        },
      },
    });

    return this.mapAuthenticatedUser(user);
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { userId },
      data: { authVersion: { increment: 1 } },
    });
  }

  private mapAuthenticatedUser(user: AuthUserRecord): AuthenticatedUserEntity {
    const context = user.UserRoles[0];

    if (!context) {
      throw new Error("Utilisateur sans role boutique.");
    }

    return {
      userId: user.userId,
      nom: user.nom,
      nomUtilisateur: user.nomUtilisateur,
      telephone: user.telephone || "",
      motDePasse: user.motDePasse,
      roleNom: context.Roles.nom,
      boutiqueId: context.boutiqueId,
      boutiqueNom: context.Boutiques.nom,
      statut: user.statut,
      doitChangerPin: user.doitChangerPin,
      authVersion: user.authVersion,
    };
  }
}
