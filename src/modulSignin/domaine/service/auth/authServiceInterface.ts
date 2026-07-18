import { AuthenticatedUserEntity } from "../../entity/authenticatedUserEntity";

export interface AuthService {
  /**
   * Génère un jeton d'accès pour un utilisateur authentifié.
   * @param user L'entité de l'utilisateur avec ses informations de contexte
   * @returns Le jeton sous forme de chaîne de caractères
   */
  generateToken(user: Omit<AuthenticatedUserEntity, "motDePasse">): string;
}