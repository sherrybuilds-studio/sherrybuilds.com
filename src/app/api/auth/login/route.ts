import { NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { COOKIE_NAME } from '@/proxy'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const LOGIN_MAX_ATTEMPTS = 10
export const LOGIN_WINDOW_MS = 15 * 60_000

const invalid = () => NextResponse.json({ error: 'Invalid password' }, { status: 401 })

// Compare fixed-length digests so the comparison neither leaks length nor
// short-circuits on the first differing byte.
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export async function POST(request: Request) {
  // Brute-force throttle: one shared static password guards /os, /demo and
  // every private /api route, so unlimited guesses were the whole game.
  if (!rateLimit(`login:${clientIp(request)}`, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS)) {
    return NextResponse.json(
      { error: 'Too many attempts — try again later.' },
      { status: 429, headers: { 'Retry-After': String(LOGIN_WINDOW_MS / 1000) } }
    )
  }

  // A missing/malformed body used to throw out of request.json() -> 500.
  let password: unknown
  try {
    const body: unknown = await request.json()
    password = body && typeof body === 'object' ? (body as Record<string, unknown>).password : undefined
  } catch {
    return invalid()
  }

  const expected = process.env.DASHBOARD_PASSWORD
  if (!expected || typeof password !== 'string' || !safeEqual(password, expected)) {
    return invalid()
  }

  const token = createHash('sha256').update(expected).digest('hex')

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
  return res
}
