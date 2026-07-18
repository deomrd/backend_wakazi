import express from "express";
import signupRouter from "./modulSignup/presentation/routes/signupRoutes";
import signinRouter from "./modulSignin/presentation/routes/signinRoutes"
import stockRouter from "./modulStock/presentation/routes/stockRoutes";
import venteRouter from "./modulVente/presentation/routes/venteRoutes";
import depenseRouter from "./modulDepense/presentation/routes/depenseRoutes";
import clotureRouter from "./modulCloture/presentation/routes/clotureRoutes";
import dashboardRouter from "./modulDashboard/presentation/routes/dashboardRoutes";
import employeRouter from "./modulEmploye/presentation/routes/employeRoutes";
import parametreBoutiqueRouter from "./modulParametreBoutique/presentation/routes/parametreBoutiqueRoutes";
import apportRouter from "./modulApport/presentation/routes/apportRoutes";
import achatRouter from "./modulAchat/presentation/routes/achatRoutes";
import inventaireRouter from "./modulInventaire/presentation/routes/inventaireRoutes";
import caisseRouter from "./modulCaisse/presentation/routes/caisseRoutes";
import rapportRouter from "./modulRapport/presentation/routes/rapportRoutes";
import { appConfig } from "./config/env";
import { prisma } from "./config/db";
import { checkDatabaseHealth } from "./shared/health/databaseHealth";
import { errorHandler, notFoundHandler } from "./shared/http/errorMiddleware";
import { requestContext, securityHeaders } from "./shared/http/requestContext";


const app = express();

app.disable("x-powered-by");
if (appConfig.trustProxyHops > 0) app.set("trust proxy", appConfig.trustProxyHops);
app.use(requestContext);
app.use(securityHeaders);
app.use(express.json({ limit: "100kb" }));
app.use(express.static("public"));

// Route de test de base
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptimeSeconds: Math.floor(process.uptime()) });
});

app.get("/api/health/live", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/health/ready", async (_req, res) => {
  const database = await checkDatabaseHealth(prisma, appConfig.readinessTimeoutMs);
  res.status(database.status === "up" ? 200 : 503).json({
    status: database.status === "up" ? "ready" : "unavailable",
    checks: { database },
  });
});

// Intégration du module SignUp
app.use("/api/auth/signup", signupRouter);
app.use("/api/auth/signin", signinRouter);
app.use("/api/stock", stockRouter);
app.use("/api/ventes", venteRouter);
app.use("/api/depenses", depenseRouter);
app.use("/api/clotures", clotureRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/employes", employeRouter);
app.use("/api/parametres/boutique", parametreBoutiqueRouter);
app.use("/api/apports", apportRouter);
app.use("/api/achats", achatRouter);
app.use("/api/inventaires", inventaireRouter);
app.use("/api/caisses", caisseRouter);
app.use("/api/rapports", rapportRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
