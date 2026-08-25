import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const COOKIE_NAME = 'sb-auth'

// Public-by-default: the portfolio at `/` is open to the world.
// Only the internal dashboard + private APIs sit behind the password gate.
const PROTECTED_PREFIXES = ['/os', '/demo', '/api']
const PUBLIC_PREFIXES = ['/login', '/api/auth', '/api/snapshot', '/api/contact', '/api/chat']

async function expectedToken(): Promise<string> {
  const password = process.env.DASHBOARD_PASSWORD ?? ''
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

  const token = request.cookies.get(COOKIE_NAME)?.value
  if (token && token === (await expectedToken())) {
    return NextResponse.next()
  }

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
