import { test } from 'node:test'
import assert from 'node:assert/strict'
import { skipReason, url } from './_server.ts'

// portfolio-next:snapshot-route-public — /api/snapshot serves the host's
// PM2/docker/firewall inventory and must sit behind the dashboard cookie gate.
test('GET /api/snapshot without a cookie is redirected to /login', { skip: skipReason }, async () => {
  const res = await fetch(url('/api/snapshot'), { redirect: 'manual' })
  assert.equal(res.status, 307, `expected redirect, got ${res.status}`)
  const loc = res.headers.get('location') ?? ''
  assert.match(loc, /\/login\?from=%2Fapi%2Fsnapshot$/, loc)
})

test('GET /up stays public (deploy health gate)', { skip: skipReason }, async () => {
  const res = await fetch(url('/up'), { redirect: 'manual' })
  assert.equal(res.status, 200)
})
