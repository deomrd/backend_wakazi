import { appConfig } from "../../config/env";

export function getJwtSecret(): string {
  return appConfig.jwtSecret;
}
