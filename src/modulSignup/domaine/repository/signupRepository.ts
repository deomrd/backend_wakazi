import { SignupEntity } from "../entity/signupEntity";
import { PaginatedResult, PaginationParams } from "../../../shared/pagination/pagination";

export interface SignupRepository {
  /**
   * Crée un nouvel utilisateur (Propriétaire) et sa boutique associée de manière atomique.
   * @param signup Données provenant de l'entité Signup
   */
  createAccount(signup: SignupEntity): Promise<void>;

  /**
   * Vérifie si un utilisateur possède déjà ce numéro de téléphone.
   * @param telephone Le numéro à vérifier
   */
  checkUserExists(telephone: string): Promise<boolean>;

  /**
   * Récupère les informations d'un compte par son numéro de téléphone.
   * @param telephone Le numéro de téléphone de l'utilisateur
   */
  getByTelephone(telephone: string): Promise<SignupEntity | null>;

  /**
   * Récupère les informations d'un compte par son identifiant.
   * @param id L'identifiant unique de l'utilisateur
   */
  getById(id: string): Promise<SignupEntity | null>;

  /**
   * Récupère la liste de tous les comptes enregistrés.
   */
  getAll(pagination: PaginationParams): Promise<PaginatedResult<SignupEntity>>;

  /**
   * Met à jour les informations d'un compte.
   * @param id L'identifiant de l'utilisateur
   * @param signup Les données partielles à modifier
   */
  update(id: string, signup: Partial<SignupEntity>): Promise<void>;

  /**
   * Supprime un compte (Utilisateur et ses relations).
   * @param id L'identifiant de l'utilisateur
   */
  delete(id: string): Promise<void>;
}
