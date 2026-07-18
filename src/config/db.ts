import { PrismaClient } from "@prisma/client";
import { appConfig } from "./env";

export const prisma = new PrismaClient({
  errorFormat: appConfig.nodeEnv === "production" ? "minimal" : "pretty",
  log: appConfig.nodeEnv === "production" ? ["error"] : ["warn", "error"],
});
