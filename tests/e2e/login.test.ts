import { test } from 'node:test'
import assert from 'node:assert/strict'
import { post, skipReason } from './_server.ts'

// portfolio-next:login-no-rate-limit-500
// Each test picks its own cf-connecting-ip so the per-IP buckets don't
// bleed into each other (locally that header is ours to set; behind
// Cloudflare it is overwritten with the real client IP).
const ip = (n: number) => ({ 'cf-connecting-ip': `203.0.113.${n}` })
const PASS = process.env.DASHBOARD_PASSWORD ?? 'test-pass-sweep'

test('empty body is 401, not 500', { skip: skipReason }, async () => {
  const res = await post('/api/auth/login', '', ip(1))
  assert.equal(res.status, 401)
})

test('malformed JSON / non-string password is 401', { skip: skipReason }, async () => {
  assert.equal((await post('/api/auth/login', '{not json', ip(2))).status, 401)
  assert.equal((await post('/api/auth/login', { password: ['x'] }, ip(2))).status, 401)
  assert.equal((await post('/api/auth/login', null, ip(2))).status, 401)
  assert.equal((await post('/api/auth/login', { password: { length: 0 } }, ip(2))).status, 401)
})

test('correct password sets the httpOnly session cookie', { skip: skipReason }, async () => {
  const res = await post('/api/auth/login', { password: PASS }, ip(3))
  assert.equal(res.status, 200)
  const cookie = res.headers.get('set-cookie') ?? ''
  assert.match(cookie, /^sb-auth=[0-9a-f]{64};/)
  assert.match(cookie, /HttpOnly/i)
  assert.match(cookie, /SameSite=lax/i)
})

test('11th wrong guess from one IP within the window is throttled (429)', { skip: skipReason }, async () => {
  let last = 0
  for (let i = 0; i < 10; i++) {
    last = (await post('/api/auth/login', { password: `wrong-${i}` }, ip(4))).status
    assert.equal(last, 401, `attempt ${i + 1}`)
  }
  const res = await post('/api/auth/login', { password: PASS }, ip(4))
  assert.equal(res.status, 429, 'even the right password is refused once throttled')
  assert.equal(res.headers.get('retry-after'), '900')
  // a different IP is unaffected
  assert.equal((await post('/api/auth/login', { password: 'wrong' }, ip(5))).status, 401)
})
