import * as bcrypt from "bcrypt";
import { SigninEntity } from "../../domaine/entity/signinEntity";
import { AuthenticatedUserEntity } from "../../domaine/entity/authenticatedUserEntity";
import { SigninRepository } from "../../domaine/repository/signinRepository";
import { InvalidCredentialsError, AccountDisabledError, InvalidPinFormatError } from "../../../shared/errorMessages/customErrors";
import { APP_MESSAGES } from "../../../shared/errorMessages/errorMessages";
import { AuthService } from "../../domaine/service/auth/authServiceInterface";

const DUMMY_PIN_HASH = "$2b$12$CwNN/hVz8cwQEot1Crt0U.yxiiaSekFNgj3bv.eL5jzJfpzEhwi3.";

export class SigninUseCase {
  constructor(
    private readonly signinRepository: SigninRepository,
    private readonly authService: AuthService
  ) {}

  async execute(signinData: SigninEntity): Promise<{ user: Omit<AuthenticatedUserEntity, "motDePasse">; token: string }> {
    this.ensurePinFormat(signinData.motDePasse);

    if (!signinData.telephone && !signinData.nomUtilisateur) {
      throw new InvalidCredentialsError(APP_MESSAGES.SIGNIN.INVALID_CREDENTIALS);
    }

    const user = await this.signinRepository.findByLogin({
      telephone: signinData.telephone,
      nomUtilisateur: signinData.nomUtilisateur,
    });

    if (!user) {
      await bcrypt.compare(signinData.motDePasse, DUMMY_PIN_HASH);
      throw new InvalidCredentialsError(APP_MESSAGES.SIGNIN.INVALID_CREDENTIALS);
    }

    if (!user.statut) {
      throw new AccountDisabledError(APP_MESSAGES.SIGNIN.ACCOUNT_DISABLED);
    }

    const passwordMatch = await bcrypt.compare(signinData.motDePasse, user.motDePasse);
    if (!passwordMatch) {
      throw new InvalidCredentialsError(APP_MESSAGES.SIGNIN.INVALID_CREDENTIALS);
    }

    const { motDePasse, ...safeUser } = user;
    const token = this.authService.generateToken(safeUser);

    return { user: safeUser, token };
  }

  async changePin(userId: string, currentPin: string, newPin: string): Promise<{ user: Omit<AuthenticatedUserEntity, "motDePasse">; token: string }> {
    this.ensurePinFormat(currentPin);
    this.ensurePinFormat(newPin);

    if (currentPin === newPin) {
      throw new Error("Le nouveau PIN doit etre different du PIN actuel.");
    }

    const user = await this.signinRepository.findById(userId);
    if (!user) {
      throw new InvalidCredentialsError(APP_MESSAGES.SIGNIN.INVALID_CREDENTIALS);
    }

    if (!user.statut) {
      throw new AccountDisabledError(APP_MESSAGES.SIGNIN.ACCOUNT_DISABLED);
    }

    const passwordMatch = await bcrypt.compare(currentPin, user.motDePasse);
    if (!passwordMatch) {
      throw new InvalidCredentialsError(APP_MESSAGES.SIGNIN.INVALID_CREDENTIALS);
    }

    const hashedPin = await bcrypt.hash(newPin, 10);
    const updated = await this.signinRepository.changePin(userId, hashedPin);
    const { motDePasse, ...safeUser } = updated;
    return { user: safeUser, token: this.authService.generateToken(safeUser) };
  }

  async changeUsername(userId: string, currentPin: string, nomUtilisateur: string): Promise<Omit<AuthenticatedUserEntity, "motDePasse">> {
    this.ensurePinFormat(currentPin);

    const user = await this.signinRepository.findById(userId);
    if (!user) {
      throw new InvalidCredentialsError(APP_MESSAGES.SIGNIN.INVALID_CREDENTIALS);
    }

    if (!user.statut) {
      throw new AccountDisabledError(APP_MESSAGES.SIGNIN.ACCOUNT_DISABLED);
    }

    const passwordMatch = await bcrypt.compare(currentPin, user.motDePasse);
    if (!passwordMatch) {
      throw new InvalidCredentialsError(APP_MESSAGES.SIGNIN.INVALID_CREDENTIALS);
    }

    const updated = await this.signinRepository.changeUsername(userId, nomUtilisateur.trim().toLowerCase());
    const { motDePasse, ...safeUser } = updated;

    return safeUser;
  }

  async logout(userId: string): Promise<void> {
    await this.signinRepository.logout(userId);
  }

  private ensurePinFormat(pin: string): void {
    if (!/^\d{4}$/.test(pin)) {
      throw new InvalidPinFormatError(APP_MESSAGES.VALIDATION.INVALID_PIN);
    }
  }
}
