/**
 * Centralisation de tous les messages de l'application.
 * Permet une maintenance facile et facilite l'internationalisation future.
 */
export const APP_MESSAGES = {
  GLOBAL: {
    INTERNAL_ERROR: "Une erreur interne est survenue sur le serveur.",
    NOT_FOUND: "La ressource demandée est introuvable.",
    UNAUTHORIZED: "Vous n'êtes pas autorisé à effectuer cette action.",
  },
  VALIDATION: {
    INVALID_PHONE: "Le numéro de téléphone est invalide (9 à 15 chiffres).",
    INVALID_PIN: "Le mot de passe doit être composé de exactement 4 chiffres.",
    REQUIRED_FIELD: (field: string) => `Le champ ${field} est obligatoire.`,
    INVALID_ENUM: "La valeur fournie est invalide pour ce type.",
  },
  SIGNUP: {
    PHONE_EXISTS: "Un compte avec ce numéro de téléphone est déjà enregistré.",
    ROLE_MISSING: "Erreur système : Le rôle 'PROPRIETAIRE' n'est pas configuré.",
    CONFLICT_DATA: "Un compte avec ce numéro de téléphone ou ce RCCM existe déjà.",
    SUCCESS: "Votre compte propriétaire et votre boutique ont été créés avec succès.",
    UPDATE_SUCCESS: "Compte mis à jour avec succès.",
    NOT_FOUND: "Compte non trouvé.",
  },
  SIGNIN: {
    INVALID_CREDENTIALS: "Numéro de téléphone ou mot de passe invalide.",
    ACCOUNT_DISABLED: "Votre compte est désactivé. Veuillez contacter l'administrateur.",
    SUCCESS: "Connexion réussie.",
  },
  AUTH: {
    INVALID_TOKEN: "Jeton d'authentification invalide ou manquant.",
    USER_NOT_FOUND: "Utilisateur non trouvé.",
  },
  // Vous ajouterez ici les autres modules au fur et à mesure
  // STOCK: { ... },
  // VENTES: { ... },
};

// Alias pour plus de clarté si besoin
export const ERRORS = APP_MESSAGES;