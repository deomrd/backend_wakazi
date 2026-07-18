import { DashboardQueryEntity } from "../entity/dashboardEntity";

export interface DashboardRepository {
  getSummary(boutiqueId: string, query: DashboardQueryEntity): Promise<unknown>;
}
