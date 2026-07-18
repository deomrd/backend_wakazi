import {
  BoutiqueFieldUpdate,
  ParametreBoutiqueEntity,
} from "../entity/parametreBoutiqueEntity";

export interface ParametreBoutiqueRepository {
  getBoutique(boutiqueId: string): Promise<ParametreBoutiqueEntity | null>;
  updateField(boutiqueId: string, data: BoutiqueFieldUpdate): Promise<ParametreBoutiqueEntity>;
}
