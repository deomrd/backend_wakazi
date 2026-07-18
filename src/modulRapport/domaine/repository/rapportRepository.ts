import { RapportFinancierFilter } from "../entity/rapportEntity";

export interface RapportRepository {
  getFinancialReport(boutiqueId: string, filters: RapportFinancierFilter): Promise<unknown>;
}
