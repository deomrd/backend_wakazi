import { Request } from "express";
import { RoleNom } from "@prisma/client";

/**
 * Payload contenu dans le jeton JWT.
 */
export interface DecodedToken {
  userId: string;
  role: RoleNom;
  boutiqueId: string;
  doitChangerPin?: boolean;
  authVersion: number;
  iat: number;
  exp: number;
}

/**
 * Extension de l'objet Request d'Express pour inclure l'utilisateur authentifié.
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: RoleNom;
    boutiqueId: string;
    doitChangerPin?: boolean;
    authVersion: number;
  };
}
