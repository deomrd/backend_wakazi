import { Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { RoleNom } from "@prisma/client";
import { APP_MESSAGES } from "../errorMessages/errorMessages";
import { DecodedToken, AuthenticatedRequest } from "../types/authTypes"; // Chemin corrigé
import { prisma } from "../../config/db";
import { getJwtSecret } from "./jwtSecret";

const JWT_SECRET = getJwtSecret();

/**
 * Middleware d'authentification : vérifie le JWT et l'état du compte en BDD.
 */
export function createAuthenticationMiddleware(database = prisma, jwtSecret = JWT_SECRET): RequestHandler {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ success: false, error: APP_MESSAGES.AUTH.INVALID_TOKEN });
      return;
    }

    const token = authHeader.split(" ")[1];
    const verified = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256"],
      issuer: "wakazi-api",
      audience: "wakazi-client",
    });
    if (!isDecodedToken(verified)) {
      res.status(401).json({ success: false, error: APP_MESSAGES.AUTH.INVALID_TOKEN });
      return;
    }
    const decoded = verified;

    // Sécurité réactive : on vérifie si l'utilisateur existe encore et si son statut est actif
    const user = await database.user.findUnique({
      where: { userId: decoded.userId },
      select: {
        statut: true,
        doitChangerPin: true,
        authVersion: true,
        UserRoles: {
          where: {
            boutiqueId: decoded.boutiqueId,
            Roles: { nom: decoded.role },
          },
          select: {
            boutiqueId: true,
            Roles: { select: { nom: true } },
          },
          take: 1,
        },
      },
    });

    if (!user) {
      res.status(401).json({ success: false, error: APP_MESSAGES.AUTH.USER_NOT_FOUND });
      return;
    }

    if (!user.statut) {
      res.status(403).json({ success: false, error: APP_MESSAGES.SIGNIN.ACCOUNT_DISABLED });
      return;
    }

    const context = user.UserRoles[0];
    if (!context || user.authVersion !== decoded.authVersion) {
      res.status(401).json({ success: false, error: APP_MESSAGES.AUTH.INVALID_TOKEN });
      return;
    }

    // Injection de l'utilisateur dans la requête pour les couches suivantes
    req.user = {
      userId: decoded.userId,
      role: context.Roles.nom,
      boutiqueId: context.boutiqueId,
      doitChangerPin: user.doitChangerPin,
      authVersion: user.authVersion,
    };

    const pinChangeException = req.originalUrl.startsWith("/api/auth/signin/change-pin")
      || req.originalUrl.startsWith("/api/auth/signin/logout");
    if (user.doitChangerPin && !pinChangeException) {
      res.status(403).json({
        success: false,
        code: "PIN_CHANGE_REQUIRED",
        message: "Vous devez changer votre PIN avant de continuer.",
      });
      return;
    }

    next();
  } catch {
    res.status(401).json({ success: false, error: APP_MESSAGES.AUTH.INVALID_TOKEN });
  }
  };
}

export const isAuthenticated = createAuthenticationMiddleware();

function isDecodedToken(value: string | jwt.JwtPayload): value is DecodedToken {
  if (typeof value === "string") return false;
  return typeof value.userId === "string"
    && typeof value.boutiqueId === "string"
    && typeof value.authVersion === "number"
    && Object.values(RoleNom).includes(value.role as RoleNom)
    && value.sub === value.userId;
}

/**
 * Middleware d'autorisation par rôle.
 * @param allowedRoles Liste des rôles autorisés (ex: [RoleNom.PROPRIETAIRE, RoleNom.GERANT])
 */
export const hasRole = (allowedRoles: RoleNom[]): RequestHandler => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: APP_MESSAGES.AUTH.INVALID_TOKEN });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        success: false, 
        error: APP_MESSAGES.GLOBAL.UNAUTHORIZED,
        message: "Vous n'avez pas les permissions nécessaires pour accéder à cette ressource."
      });
      return;
    }

    next();
  };
};
