import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const COOKIE_NAME = 'sb-auth'

// Public-by-default: the portfolio at `/` is open to the world.
// Only the internal dashboard + private APIs sit behind the password gate.
const PROTECTED_PREFIXES = ['/os', '/demo', '/api']
// `/up` is the deploy health gate (src/app/up/route.ts): it must answer
// before any cookie exists, so it is listed here explicitly even though it
// falls outside PROTECTED_PREFIXES today.
const PUBLIC_PREFIXES = ['/up', '/login', '/api/auth', '/api/snapshot', '/api/contact', '/api/chat']

async function expectedToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (!PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('from', pathname)

  // FAIL CLOSED. This used to default the password to '' and compare the
  // cookie against SHA-256(''): a container started without
  // DASHBOARD_PASSWORD (an env-parity slip on deploy) would silently unlock
  // /os, /demo and every private /api route. If the secret is missing, the
  // gate is locked, not open.
  const password = process.env.DASHBOARD_PASSWORD
  if (!password) {
    return NextResponse.redirect(loginUrl)
  }

  const token = request.cookies.get(COOKIE_NAME)?.value
  if (token && token === (await expectedToken(password))) {
    return NextResponse.next()
  }

  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
