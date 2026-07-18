import app from "./app";
import { appConfig } from "./config/env";
import { prisma } from "./config/db";

const server = app.listen(appConfig.port, () => {
  console.log(`Wakazi Backend running on port ${appConfig.port}`);
});

let shutdownStarted = false;

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (shutdownStarted) return;
  shutdownStarted = true;
  console.log(`Arrêt du serveur demandé (${signal}).`);

  const forceExit = setTimeout(() => {
    console.error("Arrêt forcé : le délai de fermeture a été dépassé.");
    process.exit(1);
  }, appConfig.shutdownTimeoutMs);
  forceExit.unref();

  server.close(async (error) => {
    try {
      await prisma.$disconnect();
    } finally {
      clearTimeout(forceExit);
      if (error) console.error("Erreur pendant l'arrêt du serveur:", error);
      process.exit(error ? 1 : exitCode);
    }
  });
  server.closeIdleConnections?.();
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("uncaughtException", (error) => {
  console.error("Erreur non interceptée:", error);
  void shutdown("uncaughtException", 1);
});
process.once("unhandledRejection", (reason) => {
  console.error("Promesse rejetée non gérée:", reason);
  void shutdown("unhandledRejection", 1);
});
