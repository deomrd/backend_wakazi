import { SigninEntity } from "../entity/signinEntity";
import { AuthenticatedUserEntity } from "../entity/authenticatedUserEntity";

/**
 * Interface définissant les opérations d'accès aux données pour la connexion.
 */
export interface SigninRepository {
  /**
   * Trouve un utilisateur par son numéro de téléphone et retourne ses informations d'authentification.
   * @param telephone Le numéro de téléphone de l'utilisateur.
   * @returns Une AuthenticatedUserEntity si l'utilisateur est trouvé, sinon null.
   */
  findByLogin(login: { telephone?: string; nomUtilisateur?: string }): Promise<AuthenticatedUserEntity | null>;

  findById(userId: string): Promise<AuthenticatedUserEntity | null>;

  changePin(userId: string, hashedPin: string): Promise<AuthenticatedUserEntity>;

  changeUsername(userId: string, nomUtilisateur: string): Promise<AuthenticatedUserEntity>;

  /**
   * Gère la déconnexion d'un utilisateur au niveau de la persistance.
   * @param userId L'identifiant unique de l'utilisateur.
   */
  logout(userId: string): Promise<void>;
}
