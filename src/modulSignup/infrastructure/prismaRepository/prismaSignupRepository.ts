import { Prisma, PrismaClient, RoleNom } from "@prisma/client";
import { SignupRepository } from "../../domaine/repository/signupRepository";
import { SignupEntity } from "../../domaine/entity/signupEntity";
import { APP_MESSAGES } from "../../../shared/errorMessages/errorMessages";
import { getPaginationArgs, paginatedResult, PaginationParams } from "../../../shared/pagination/pagination";

export class PrismaSignupRepository implements SignupRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Implémentation professionnelle avec transaction atomique.
   * Crée l'utilisateur, lui assigne le rôle de PROPRIETAIRE et crée sa boutique.
   */
  async createAccount(signup: SignupEntity): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. Création de l'utilisateur
        const user = await tx.user.create({
          data: {
            nom: signup.nom,
            telephone: signup.telephone,
            motDePasse: signup.motDePasse, // Doit être haché au préalable par le Use Case
            statut: true,
          },
        });

        // 2. Récupération du rôle PROPRIETAIRE (le seed doit exister)
        const role = await tx.role.findUnique({
          where: { nom: RoleNom.PROPRIETAIRE },
        });

        if (!role) {
          throw new Error(APP_MESSAGES.SIGNUP.ROLE_MISSING);
        }

        // 3. Création de la boutique initiale
        const boutique = await tx.boutique.create({
          data: {
            nom: signup.nomBoutique,
            adresse: signup.adresseBoutique,
            devise: signup.devise || "USD",
            deviseSecondaire: signup.deviseSecondaire,
            tauxDeviseSecondaire: signup.tauxDeviseSecondaire,
            typeEntreprise: signup.typeEntreprise,
            RCCM: signup.RCCM,
            proprietaireId: user.userId,
          },
        });

        // 4. Liaison User-Role-Boutique via UserRole
        await tx.userRole.create({
          data: {
            userId: user.userId,
            roleId: role.roleId,
            boutiqueId: boutique.boutiqueId,
          },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error(APP_MESSAGES.SIGNUP.CONFLICT_DATA);
      }
      throw error;
    }
  }

  async checkUserExists(telephone: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { telephone },
      select: { userId: true },
    });
    return user !== null;
  }

  async getByTelephone(telephone: string): Promise<SignupEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { telephone },
      include: { OwnedBoutiques: true },
    });
    return user ? this.mapToEntity(user) : null;
  }

  async getById(id: string): Promise<SignupEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { userId: id },
      include: { OwnedBoutiques: true },
    });
    return user ? this.mapToEntity(user) : null;
  }

  async getAll(pagination: PaginationParams) {
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        include: { OwnedBoutiques: true },
        orderBy: { createdAt: "desc" },
        ...getPaginationArgs(pagination),
      }),
      this.prisma.user.count(),
    ]);

    return paginatedResult(users.map((user) => this.mapToEntity(user)), total, pagination);
  }

  /**
   * Met à jour les informations d'un compte.
   * @param id L'identifiant de l'utilisateur
   * @param signup Les données partielles à modifier
   */
  async update(id: string, signup: Partial<SignupEntity>): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Mettre à jour les données de l'utilisateur
      await tx.user.update({
        where: { userId: id },
        data: {
          nom: signup.nom,
          telephone: signup.telephone,
          motDePasse: signup.motDePasse, // Doit être haché au préalable par le Use Case si modifié
        },
      });

      // Si des détails de boutique sont fournis, mettre à jour la boutique associée
      if (signup.nomBoutique || signup.adresseBoutique || signup.devise || signup.deviseSecondaire || signup.tauxDeviseSecondaire || signup.typeEntreprise || signup.RCCM) {
        const boutique = await tx.boutique.findFirst({
          where: { proprietaireId: id },
        });

        if (boutique) {
          await tx.boutique.update({
            where: { boutiqueId: boutique.boutiqueId },
            data: {
              nom: signup.nomBoutique,
              adresse: signup.adresseBoutique,
              devise: signup.devise,
              deviseSecondaire: signup.deviseSecondaire,
              tauxDeviseSecondaire: signup.tauxDeviseSecondaire,
              typeEntreprise: signup.typeEntreprise,
              RCCM: signup.RCCM,
            },
          });
        } else {
          console.warn(`Aucune boutique trouvée pour l'utilisateur ${id} lors de l'opération de mise à jour.`);
        }
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { userId: id },
    });
  }

  private mapToEntity(user: Prisma.UserGetPayload<{ include: { OwnedBoutiques: true } }>): SignupEntity {
    const boutique = user.OwnedBoutiques?.[0];
    return {
      nom: user.nom,
      telephone: user.telephone || undefined,
      motDePasse: user.motDePasse, // Hashé. Attention : ne pas renvoyer brut via l'API
      nomBoutique: boutique?.nom || "",
      adresseBoutique: boutique?.adresse || "",
      typeEntreprise: boutique?.typeEntreprise,
      RCCM: boutique?.RCCM || undefined,
      devise: boutique?.devise,
      deviseSecondaire: boutique?.deviseSecondaire || undefined,
      tauxDeviseSecondaire: boutique?.tauxDeviseSecondaire ? Number(boutique.tauxDeviseSecondaire) : undefined,
    };
  }
}
