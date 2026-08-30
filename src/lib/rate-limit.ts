// Tiny in-process fixed-window rate limiter for the public POST routes.
// Single-instance deployment (one container / one PM2 fork), so a Map is
// enough; it resets on restart, which is acceptable for abuse throttling —
// a Cloudflare rate-limiting rule is the durable layer (see PR notes).
// Keyed by the Cloudflare-set client IP (see clientIp) — never by a header
// the browser can choose.

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()
const MAX_KEYS = 10_000

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k)
      if (buckets.size >= MAX_KEYS) buckets.clear()
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  b.count += 1
  return b.count <= limit
}

/** Test hook: forget every bucket. */
export function resetRateLimits(): void {
  buckets.clear()
}

// Only cf-connecting-ip is trusted: Cloudflare sets/overwrites it on every
// request that comes through the tunnel. X-Forwarded-For is attacker-chosen
// and must never be used as a rate-limit key or forwarded downstream as one.
// Anything that reaches the server without Cloudflare (loopback, tailnet,
// dev server) shares the single 'unknown' bucket, which is the safe side.
export function clientIp(req: Request): string {
  return req.headers.get('cf-connecting-ip')?.trim() || 'unknown'
}
