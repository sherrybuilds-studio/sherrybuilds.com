import { test } from 'node:test'
import assert from 'node:assert/strict'
import { skipReason, url } from './_server.ts'

// portfolio-next:missing-security-headers
for (const path of ['/', '/login', '/up']) {
  test(`${path} carries the baseline security headers and no X-Powered-By`, { skip: skipReason }, async () => {
    const res = await fetch(url(path), { redirect: 'manual' })
    const h = res.headers
    assert.equal(h.get('x-powered-by'), null)
    assert.equal(h.get('x-content-type-options'), 'nosniff')
    assert.equal(h.get('x-frame-options'), 'DENY')
    assert.equal(h.get('referrer-policy'), 'strict-origin-when-cross-origin')
    assert.match(h.get('permissions-policy') ?? '', /camera=\(\)/)
    assert.match(h.get('strict-transport-security') ?? '', /max-age=31536000/)
  })
}
