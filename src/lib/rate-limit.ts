// Tiny in-process fixed-window rate limiter for the public POST routes.
// Single-instance deployment (one container / one PM2 fork), so a Map is
// enough; it resets on restart, which is acceptable for abuse throttling.
// Keyed by the Cloudflare-set client IP (see clientIp) — never by a header
// the browser can choose.

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()
const MAX_KEYS = 10_000

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
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

// Only cf-connecting-ip is trusted: Cloudflare sets/overwrites it on every
// request that comes through the tunnel. X-Forwarded-For is attacker-chosen
// and must never be used as a rate-limit key or forwarded downstream as one.
export function clientIp(req: Request): string {
  return req.headers.get('cf-connecting-ip')?.trim() || 'unknown'
}
