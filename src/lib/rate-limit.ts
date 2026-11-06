import { NextResponse } from "next/server";
import { prisma } from "./db";

/**
 * Fixed-window rate limiting backed by Postgres, so the count is shared by
 * every serverless instance. One atomic upsert per check. If the database
 * call itself fails we let the request through: a limiter outage must never
 * stop guests from booking.
 */
export async function hit(key: string, limit: number, windowSeconds: number) {
  try {
    const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt")
      VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
      ON CONFLICT ("key") DO UPDATE SET
        "count"   = CASE WHEN "RateLimit"."resetAt" < now() THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" < now() THEN EXCLUDED."resetAt" ELSE "RateLimit"."resetAt" END
      RETURNING "count", "resetAt"`;
    const row = rows[0];
    if (!row) return { ok: true as const, retryAfter: 0 };
    const retryAfter = Math.max(1, Math.ceil((new Date(row.resetAt).getTime() - Date.now()) / 1000));
    return Number(row.count) > limit ? { ok: false as const, retryAfter } : { ok: true as const, retryAfter: 0 };
  } catch (error) {
    console.error("[rate-limit]", error);
    return { ok: true as const, retryAfter: 0 };
  }
}

/** Current count for a key without adding to it (0 once the window has passed). */
export async function peekHits(key: string) {
  try {
    const row = await prisma.rateLimit.findUnique({ where: { key } });
    if (!row || row.resetAt < new Date()) return 0;
    return row.count;
  } catch {
    return 0;
  }
}

/** Forget a key, e.g. failed-login counter after a successful login. */
export async function clearHits(key: string) {
  try {
    await prisma.rateLimit.delete({ where: { key } });
  } catch {
    /* not there */
  }
}

export function clientIp(request: Request) {
  const h = request.headers;
  return (
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}

export function tooMany(retryAfter: number, message = "Too many attempts. Please wait a few minutes and try again.") {
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

/** Housekeeping for the daily cron. */
export async function purgeExpiredHits() {
  try {
    await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } });
  } catch (error) {
    console.error("[rate-limit purge]", error);
  }
}
