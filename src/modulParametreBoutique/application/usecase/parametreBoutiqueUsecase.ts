import { TypeEntreprise } from "@prisma/client";
import { ParametreBoutiqueRepository } from "../../domaine/repository/parametreBoutiqueRepository";

export class ParametreBoutiqueUseCase {
  constructor(private readonly parametreBoutiqueRepository: ParametreBoutiqueRepository) {}

  getBoutique(boutiqueId: string) {
    return this.parametreBoutiqueRepository.getBoutique(boutiqueId);
  }

  updateNom(boutiqueId: string, nom: string) {
    return this.parametreBoutiqueRepository.updateField(boutiqueId, { nom: nom.trim() });
  }

  updateAdresse(boutiqueId: string, adresse: string | null) {
    return this.parametreBoutiqueRepository.updateField(boutiqueId, {
      adresse: adresse === null ? null : adresse.trim(),
    });
  }

  updateDevise(boutiqueId: string, devise: string) {
    return this.parametreBoutiqueRepository.updateField(boutiqueId, { devise: devise.trim().toUpperCase() });
  }

  updateDeviseSecondaire(boutiqueId: string, deviseSecondaire: string | null) {
    return this.parametreBoutiqueRepository.updateField(boutiqueId, {
      deviseSecondaire: deviseSecondaire === null ? null : deviseSecondaire.trim().toUpperCase(),
    });
  }

  updateTauxDeviseSecondaire(boutiqueId: string, tauxDeviseSecondaire: number | null) {
    return this.parametreBoutiqueRepository.updateField(boutiqueId, { tauxDeviseSecondaire });
  }

  updateRccm(boutiqueId: string, RCCM: string | null) {
    return this.parametreBoutiqueRepository.updateField(boutiqueId, {
      RCCM: RCCM === null ? null : RCCM.trim(),
    });
  }

  updateTypeEntreprise(boutiqueId: string, typeEntreprise: TypeEntreprise) {
    return this.parametreBoutiqueRepository.updateField(boutiqueId, { typeEntreprise });
  }
}
