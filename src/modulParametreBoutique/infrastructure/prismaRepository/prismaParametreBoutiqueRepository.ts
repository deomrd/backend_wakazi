import { PrismaClient } from "@prisma/client";
import {
  BoutiqueFieldUpdate,
  ParametreBoutiqueEntity,
} from "../../domaine/entity/parametreBoutiqueEntity";
import { ParametreBoutiqueRepository } from "../../domaine/repository/parametreBoutiqueRepository";

export class PrismaParametreBoutiqueRepository implements ParametreBoutiqueRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getBoutique(boutiqueId: string): Promise<ParametreBoutiqueEntity | null> {
    return this.prisma.boutique.findUnique({
      where: { boutiqueId },
    });
  }

  async updateField(boutiqueId: string, data: BoutiqueFieldUpdate): Promise<ParametreBoutiqueEntity> {
    return this.prisma.boutique.update({
      where: { boutiqueId },
      data,
    });
  }
}
