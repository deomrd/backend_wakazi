/**
 * Fichier centralisant les classes d'erreurs personnalisées pour l'application.
 * Permet une gestion des erreurs plus typée et sémantique.
 */

export class InvalidCredentialsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCredentialsError";
  }
}

export class AccountDisabledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountDisabledError";
  }
}

export class InvalidPinFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPinFormatError";
  }
}