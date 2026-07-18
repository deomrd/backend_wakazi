import { DashboardQueryEntity } from "../../domaine/entity/dashboardEntity";
import { DashboardRepository } from "../../domaine/repository/dashboardRepository";

export class DashboardUseCase {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  getSummary(boutiqueId: string, query: DashboardQueryEntity) {
    return this.dashboardRepository.getSummary(boutiqueId, query);
  }
}
