import { z } from "zod";

export const dashboardQuerySchema = z.object({
  date: z.coerce.date().optional(),
  dateDebut: z.coerce.date().optional(),
  dateFin: z.coerce.date().optional(),
});
