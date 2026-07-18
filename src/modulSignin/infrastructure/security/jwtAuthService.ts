import jwt from "jsonwebtoken";
import { AuthService } from "../../domaine/service/auth/authServiceInterface"; // Chemin corrigé
import { AuthenticatedUserEntity } from "../../domaine/entity/authenticatedUserEntity";
import { getJwtSecret } from "../../../shared/security/jwtSecret";

export class JwtAuthService implements AuthService {
  private readonly secret = getJwtSecret();

  /**
   * Implémentation concrète utilisant JWT.
   */
  generateToken(user: Omit<AuthenticatedUserEntity, "motDePasse">): string {
    return jwt.sign(
      { 
        userId: user.userId, 
        role: user.roleNom,
        boutiqueId: user.boutiqueId,
        doitChangerPin: user.doitChangerPin,
        authVersion: user.authVersion,
      },
      this.secret,
      {
        algorithm: "HS256",
        expiresIn: "24h",
        issuer: "wakazi-api",
        audience: "wakazi-client",
        subject: user.userId,
      }
    );
  }
}
