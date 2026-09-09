/**
 * In-memory sliding window used by MCP and REST.
 * Hosting/WAF may throttle earlier. One process = one counter (serverless
 * instances do not share memory).
 */

export const RATE_LIMIT = {
  limit: 180,
  windowMs: 60_000,
  windowLabel: "60 seconds",
  scope: "per client IP, per process",
} as const;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function prune(now: number) {
  if (buckets.size < 4_000) return;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 128);
  return "unknown";
}

export function consumeNamedLimit(
  key: string,
  limit: number,
  windowMs: number,
): {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
} {
  const now = Date.now();
  prune(now);
  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  if (bucket.count > limit) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt, retryAfterSec };
  }
  return { ok: true, remaining, resetAt: bucket.resetAt, retryAfterSec };
}

export function consumeRateLimit(ip: string): {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
} {
  return consumeNamedLimit(ip, RATE_LIMIT.limit, RATE_LIMIT.windowMs);
}

export function rateLimitHeaders(result: ReturnType<typeof consumeRateLimit>): HeadersInit {
  return {
    "RateLimit-Limit": String(RATE_LIMIT.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    ...(result.ok ? {} : { "Retry-After": String(result.retryAfterSec) }),
  };
}

export function rateLimitedJson(result: ReturnType<typeof consumeRateLimit>, extra: Record<string, unknown> = {}) {
  return Response.json(
    {
      ok: false,
      error: "RATE_LIMITED",
      message: `Too many requests. Limit is ${RATE_LIMIT.limit} per ${RATE_LIMIT.windowLabel} (${RATE_LIMIT.scope}).`,
      retryAfterSec: result.retryAfterSec,
      ...extra,
    },
    { status: 429, headers: rateLimitHeaders(result) },
  );
}

export function checkRateLimit(req: Request): { ok: true; headers: HeadersInit } | { ok: false; response: Response } {
  const result = consumeRateLimit(clientIp(req));
  if (!result.ok) return { ok: false, response: rateLimitedJson(result) };
  return { ok: true, headers: rateLimitHeaders(result) };
}
