export interface DatabaseHealth {
  status: "up" | "down";
  latencyMs: number;
}

interface DatabaseProbe {
  $queryRawUnsafe<T = unknown>(query: string): Promise<T>;
}

export async function checkDatabaseHealth(database: DatabaseProbe, timeoutMs: number): Promise<DatabaseHealth> {
  const startedAt = process.hrtime.bigint();
  let timeout: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      database.$queryRawUnsafe("SELECT 1"),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Database readiness timeout")), timeoutMs);
      }),
    ]);
    return { status: "up", latencyMs: elapsedMs(startedAt) };
  } catch {
    return { status: "down", latencyMs: elapsedMs(startedAt) };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function elapsedMs(startedAt: bigint): number {
  return Number((Number(process.hrtime.bigint() - startedAt) / 1_000_000).toFixed(2));
}
