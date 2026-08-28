import { test } from 'node:test'
import assert from 'node:assert/strict'
import { post, skipReason } from './_server.ts'

// portfolio-next:contact-unthrottled-resend-relay
// Runs against the stub path (no RESEND_API_KEY on the test server), so no
// email is sent; the throttle sits before delivery either way.
const body = { name: 'Test Person', email: 'test@example.com', message: 'This is a long enough message.' }
const ip = (n: number) => ({ 'cf-connecting-ip': `203.0.113.${200 + n}` })

test('6th submission per hour from one IP is throttled (429)', { skip: skipReason }, async () => {
  for (let i = 0; i < 5; i++) {
    assert.equal((await post('/api/contact', body, ip(1))).status, 200, `submission ${i + 1}`)
  }
  assert.equal((await post('/api/contact', body, ip(1))).status, 429)
  assert.equal((await post('/api/contact', body, ip(2))).status, 200, 'other IP unaffected')
})

test('invalid input is still 400', { skip: skipReason }, async () => {
  assert.equal((await post('/api/contact', { name: 'x' }, ip(3))).status, 400)
})
