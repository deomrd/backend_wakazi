import { Request, RequestHandler } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
  maxKeys?: number;
  now?: () => number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const entries = new Map<string, RateLimitEntry>();
  const maxKeys = options.maxKeys ?? 10_000;
  const now = options.now ?? Date.now;

  return (req, res, next) => {
    const currentTime = now();
    const key = (options.keyGenerator?.(req) || req.ip || "unknown").slice(0, 250);
    let entry = entries.get(key);

    if (!entry || entry.resetAt <= currentTime) {
      ensureCapacity(entries, maxKeys, currentTime);
      entry = { count: 0, resetAt: currentTime + options.windowMs };
      entries.set(key, entry);
    }

    const remaining = Math.max(0, options.max - entry.count - 1);
    res.setHeader("RateLimit-Limit", String(options.max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count >= options.max) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((entry.resetAt - currentTime) / 1000))));
      res.status(429).json({
        success: false,
        message: options.message ?? "Trop de tentatives. Réessayez plus tard.",
      });
      return;
    }

    entry.count += 1;
    next();
  };
}

function ensureCapacity(entries: Map<string, RateLimitEntry>, maxKeys: number, currentTime: number): void {
  if (entries.size < maxKeys) return;
  for (const [key, entry] of entries) {
    if (entry.resetAt <= currentTime) entries.delete(key);
  }
  while (entries.size >= maxKeys) {
    const oldestKey = entries.keys().next().value as string | undefined;
    if (!oldestKey) return;
    entries.delete(oldestKey);
  }
}
