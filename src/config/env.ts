import "dotenv/config";

export type NodeEnvironment = "development" | "test" | "production";

export interface AppConfig {
  nodeEnv: NodeEnvironment;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  trustProxyHops: number;
  readinessTimeoutMs: number;
  shutdownTimeoutMs: number;
}

export function loadAppConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = parseNodeEnvironment(environment.NODE_ENV);
  const databaseUrl = required(environment.DATABASE_URL, "DATABASE_URL");
  const jwtSecret = validateJwtSecret(required(environment.JWT_SECRET, "JWT_SECRET"), nodeEnv);

  return {
    nodeEnv,
    port: integer(environment.PORT, 4000, 1, 65_535, "PORT"),
    databaseUrl,
    jwtSecret,
    trustProxyHops: integer(environment.TRUST_PROXY_HOPS, 0, 0, 5, "TRUST_PROXY_HOPS"),
    readinessTimeoutMs: integer(environment.READINESS_TIMEOUT_MS, 2_000, 250, 30_000, "READINESS_TIMEOUT_MS"),
    shutdownTimeoutMs: integer(environment.SHUTDOWN_TIMEOUT_MS, 10_000, 1_000, 60_000, "SHUTDOWN_TIMEOUT_MS"),
  };
}

function parseNodeEnvironment(value?: string): NodeEnvironment {
  const normalized = (value || "development").trim().toLowerCase();
  if (normalized === "development" || normalized === "test" || normalized === "production") return normalized;
  throw new Error("NODE_ENV doit être development, test ou production.");
}

function required(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name} doit être défini dans les variables d'environnement.`);
  return normalized;
}

function integer(value: string | undefined, fallback: number, min: number, max: number, name: string): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} doit être un entier compris entre ${min} et ${max}.`);
  }
  return parsed;
}

function validateJwtSecret(secret: string, nodeEnv: NodeEnvironment): string {
  if (/^(change_me|replace_me)/i.test(secret)) {
    throw new Error("JWT_SECRET utilise une valeur d'exemple interdite.");
  }
  const minimumLength = nodeEnv === "production" ? 32 : 16;
  if (secret.length < minimumLength) {
    throw new Error(`JWT_SECRET doit contenir au moins ${minimumLength} caractères.`);
  }
  return secret;
}

export const appConfig = loadAppConfig();
