import { test } from 'node:test'
import assert from 'node:assert/strict'
import { post, skipReason } from './_server.ts'

// portfolio-next:contact-unthrottled-resend-relay
// The test server has no SUPABASE/TELEGRAM/RESEND env, so a valid submission
// answers 502 ("try email instead") rather than a false success — see
// src/lib/contact-pipeline.ts. The throttle sits before delivery either way,
// so the 6th hit is 429 regardless of what the channels do.
const body = { name: 'Test Person', email: 'test@example.com', message: 'This is a long enough message.' }
const ip = (n: number) => ({ 'cf-connecting-ip': `203.0.113.${200 + n}` })

test('6th submission per hour from one IP is throttled (429)', { skip: skipReason }, async () => {
  for (let i = 0; i < 5; i++) {
    const status = (await post('/api/contact', body, ip(1))).status
    assert.ok(status === 200 || status === 502, `submission ${i + 1} reached the pipeline (got ${status})`)
  }
  assert.equal((await post('/api/contact', body, ip(1))).status, 429)
  assert.notEqual((await post('/api/contact', body, ip(2))).status, 429, 'other IP unaffected')
})

test('a valid submission with no channel configured is 502, never a false 200', { skip: skipReason }, async () => {
  const res = await post('/api/contact', body, ip(4))
  assert.equal(res.status, 502)
  const json = (await res.json()) as { ok: boolean; error: string }
  assert.equal(json.ok, false)
  assert.match(json.error, /email instead/)
})

test('invalid input is still 400', { skip: skipReason }, async () => {
  assert.equal((await post('/api/contact', { name: 'x' }, ip(3))).status, 400)
})
