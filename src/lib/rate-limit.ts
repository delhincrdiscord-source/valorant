// DB-backed, serverless-safe rate limiter.
//
// A plain in-memory Map resets on every function instance (bad on Vercel) and
// can't share state across instances. Storing attempts in Postgres (via Prisma)
// means the window survives restarts and works across all serverless
// invocations, at the cost of one count + one insert per request — cheap here.

import { prisma } from "./prisma";

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the caller may retry (when denied). */
  retryAfterSec: number;
}

/**
 * Check + record one attempt for `key`. Succeeds if fewer than `max` attempts
 * happened within the last `windowMs`. Opportunistically prunes rows older than
 * an hour so the table never grows unbounded.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const cutoff = new Date(now - windowMs);

  const count = await prisma.rateLimit.count({
    where: { key, createdAt: { gte: cutoff } },
  });

  if (count >= max) {
    // Retry when the oldest in-window attempt falls out of the window.
    const oldest = await prisma.rateLimit.findFirst({
      where: { key, createdAt: { gte: cutoff } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    const retryAfterSec = oldest
      ? Math.max(1, Math.ceil((oldest.createdAt.getTime() + windowMs - now) / 1000))
      : Math.ceil(windowMs / 1000);
    return { ok: false, retryAfterSec };
  }

  await prisma.rateLimit.create({ data: { key } });

  // Prune entries older than an hour. Best-effort; a failure here must not
  // break registrations.
  try {
    await prisma.rateLimit.deleteMany({
      where: { createdAt: { lt: new Date(now - 60 * 60 * 1000) } },
    });
  } catch {
    // ignore
  }

  return { ok: true, retryAfterSec: 0 };
}

/**
 * Best-effort client IP. `x-forwarded-for` is set by the hosting platform
 * (Vercel overwrites it), so the first value is trustworthy there; we never
 * trust client-sent header values over the platform's.
 */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}
