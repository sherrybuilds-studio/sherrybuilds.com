import { NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { COOKIE_NAME } from '@/proxy'
import { clientIp, rateLimit } from '@/lib/rate-limit'

const INVALID = () => NextResponse.json({ error: 'Invalid password' }, { status: 401 })

function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export async function POST(request: Request) {
  // Brute-force throttle: 10 attempts per 15 minutes per client IP.
  if (!rateLimit(`login:${clientIp(request)}`, 10, 15 * 60_000)) {
    return NextResponse.json({ error: 'Too many attempts — try again later.' }, { status: 429 })
  }

  let password: unknown
  try {
    ;({ password } = await request.json())
  } catch {
    return INVALID()
  }
  const expected = process.env.DASHBOARD_PASSWORD
  if (!expected || typeof password !== 'string' || !safeEqual(password, expected)) {
    return INVALID()
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
