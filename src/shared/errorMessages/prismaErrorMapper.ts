import { Prisma } from "@prisma/client";

export interface HttpErrorPayload {
  statusCode: number;
  message: string;
}

export function mapPrismaError(error: unknown): HttpErrorPayload | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  if (error.code === "P2002") {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : String(error.meta?.target || "");

    return {
      statusCode: 409,
      message: uniqueConstraintMessage(target),
    };
  }

  if (error.code === "P2003") {
    return {
      statusCode: 400,
      message: "Cette opération référence une donnée inexistante ou liée à une autre boutique.",
    };
  }

  if (error.code === "P2025") {
    return {
      statusCode: 404,
      message: "La ressource demandée est introuvable.",
    };
  }

  return null;
}

function uniqueConstraintMessage(target: string): string {
  if (target.includes("codeQR")) {
    return "Ce code QR est déjà utilisé par un autre produit. Laissez le champ vide ou utilisez un code différent.";
  }

  if (target.includes("telephone")) {
    return "Ce numéro de téléphone existe déjà.";
  }

  if (target.includes("nom") && target.includes("boutiqueId")) {
    return "Ce nom existe déjà dans cette boutique.";
  }

  if (target.includes("numeroReference")) {
    return "Cette référence existe déjà pour cette boutique.";
  }

  return "Cette donnée existe déjà. Vérifiez les champs uniques puis réessayez.";
}
