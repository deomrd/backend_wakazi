import * as bcrypt from "bcrypt";
import { SignupEntity } from "../../domaine/entity/signupEntity";
import { SignupRepository } from "../../domaine/repository/signupRepository";
import { APP_MESSAGES } from "../../../shared/errorMessages/errorMessages";
import { PaginationParams } from "../../../shared/pagination/pagination";

/**
 * Cas d'utilisation pour l'inscription d'un nouveau propriétaire.
 * Gère la logique métier, la validation de base et la sécurité.
 */
export class SignupUseCase {
  constructor(private readonly signupRepository: SignupRepository) {}

  /**
   * Exécute le processus d'inscription.
   * @param signupData Données d'inscription (User + Boutique)
   */
  async execute(signupData: SignupEntity): Promise<void> {
    // 1. Validation de l'existence du compte
    // On utilise le numéro de téléphone comme identifiant unique principal
    if (!signupData.telephone) {
      // Sécurité supplémentaire : même si Zod valide en amont, on s'assure ici de la présence de la donnée
      throw new Error(APP_MESSAGES.VALIDATION.REQUIRED_FIELD("téléphone"));
    }

    const alreadyExists = await this.signupRepository.checkUserExists(signupData.telephone);
    if (alreadyExists) {
      throw new Error(APP_MESSAGES.SIGNUP.PHONE_EXISTS);
    }

    // 2. Sécurité : Hachage du mot de passe
    // Le repository ne doit jamais recevoir de mot de passe en clair.
    const saltRounds = 12; // Niveau de sécurité recommandé
    const hashedPassword = await bcrypt.hash(signupData.motDePasse, saltRounds);

    // 3. Persistance via le repository
    // On crée l'entité finale avec le mot de passe sécurisé
    await this.signupRepository.createAccount({
      ...signupData,
      motDePasse: hashedPassword,
    });
  }

  /**
   * Récupère un compte utilisateur par son numéro de téléphone.
   * @param telephone Le numéro de téléphone de l'utilisateur.
   * @returns L'entité SignupEntity ou null si non trouvé.
   */
  async getAccountByTelephone(telephone: string): Promise<SignupEntity | null> {
    return this.signupRepository.getByTelephone(telephone);
  }

  /**
   * Récupère un compte utilisateur par son ID.
   * @param id L'ID de l'utilisateur.
   * @returns L'entité SignupEntity ou null si non trouvé.
   */
  async getAccountById(id: string): Promise<SignupEntity | null> {
    return this.signupRepository.getById(id);
  }

  /**
   * Récupère tous les comptes utilisateurs.
   * NOTE: Pour une application professionnelle, cette méthode devrait inclure la pagination et des filtres.
   * @returns Une liste d'entités SignupEntity.
   */
  async getAllAccounts(pagination: PaginationParams) {
    return this.signupRepository.getAll(pagination);
  }

  /**
   * Met à jour les informations d'un compte utilisateur.
   * @param id L'ID de l'utilisateur à mettre à jour.
   * @param updateData Les données partielles à modifier.
   */
  async updateAccount(id: string, updateData: Partial<SignupEntity>): Promise<void> {
    const dataToUpdate = { ...updateData };

    if (dataToUpdate.motDePasse) {
      dataToUpdate.motDePasse = await bcrypt.hash(dataToUpdate.motDePasse, 12);
    }

    await this.signupRepository.update(id, dataToUpdate);
  }

  /**
   * Supprime un compte utilisateur.
   * @param id L'ID de l'utilisateur à supprimer.
   */
  async deleteAccount(id: string): Promise<void> {
    // Ajouter toute logique métier avant la suppression, ex: vérification des permissions
    await this.signupRepository.delete(id);
  }
}
