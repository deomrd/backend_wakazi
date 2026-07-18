import { Prisma, PrismaClient } from "@prisma/client";

export function getDayBounds(date: Date = new Date()): { dateJournee: Date; start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { dateJournee: start, start, end };
}

export async function ensureDayNotClosed(
  client: PrismaClient | Prisma.TransactionClient,
  boutiqueId: string,
  date: Date = new Date()
): Promise<void> {
  const { dateJournee } = getDayBounds(date);
  const existingClosure = await client.clotureJournee.findUnique({
    where: {
      boutiqueId_dateJournee: {
        boutiqueId,
        dateJournee,
      },
    },
    select: { clotureJourneeId: true },
  });

  if (existingClosure) {
    throw new Error("Cette journee est deja cloturee. Aucune operation ne peut etre ajoutee pour cette date.");
  }
}
