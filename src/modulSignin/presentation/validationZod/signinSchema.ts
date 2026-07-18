import { z } from "zod";
import { APP_MESSAGES } from "../../../shared/errorMessages/errorMessages";

const pinSchema = z
  .string(APP_MESSAGES.VALIDATION.REQUIRED_FIELD("PIN"))
  .length(4, APP_MESSAGES.VALIDATION.INVALID_PIN)
  .regex(/^\d+$/, APP_MESSAGES.VALIDATION.INVALID_PIN);

export const signinSchema = z
  .object({
    telephone: z
      .string()
      .trim()
      .regex(/^\d{9,15}$/, APP_MESSAGES.VALIDATION.INVALID_PHONE)
      .optional(),
    nomUtilisateur: z
      .string()
      .trim()
      .min(3, APP_MESSAGES.VALIDATION.REQUIRED_FIELD("nom d'utilisateur"))
      .optional(),
    motDePasse: pinSchema,
  })
  .refine((data) => Boolean(data.telephone || data.nomUtilisateur), {
    message: "Telephone ou nom d'utilisateur obligatoire.",
    path: ["telephone"],
  });

export const changePinSchema = z.object({
  currentPin: pinSchema,
  newPin: pinSchema,
});

export const changeUsernameSchema = z.object({
  currentPin: pinSchema,
  nomUtilisateur: z
    .string(APP_MESSAGES.VALIDATION.REQUIRED_FIELD("nom d'utilisateur"))
    .trim()
    .min(3, APP_MESSAGES.VALIDATION.REQUIRED_FIELD("nom d'utilisateur")),
});
