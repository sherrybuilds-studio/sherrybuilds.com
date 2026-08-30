// Shared helper for the HTTP-level security tests. They run against an
// already-started server (`next start -p 3200` from a fresh build with
// DASHBOARD_PASSWORD set) so the same assertions hold in CI and on the box:
//
//   DASHBOARD_PASSWORD=test-pass npx next start -p 3200 &
//   BASE_URL=http://127.0.0.1:3200 npm test
//
// Without BASE_URL the e2e files skip themselves instead of failing, so
// `npm test` stays green for the unit tests alone.
export const BASE = process.env.BASE_URL ?? ''
export const skipReason = BASE ? false : 'BASE_URL not set — start `next start -p 3200` first'

export function url(path: string): string {
  return `${BASE}${path}`
}

export async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return fetch(url(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    redirect: 'manual',
  })
}
