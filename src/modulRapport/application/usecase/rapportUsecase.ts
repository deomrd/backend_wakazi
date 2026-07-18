import { RapportFinancierFilter } from "../../domaine/entity/rapportEntity";
import { RapportRepository } from "../../domaine/repository/rapportRepository";

export class RapportUseCase {
  constructor(private readonly repository: RapportRepository) {}
  getFinancialReport(boutiqueId: string, filters: RapportFinancierFilter) { return this.repository.getFinancialReport(boutiqueId, filters); }
}
