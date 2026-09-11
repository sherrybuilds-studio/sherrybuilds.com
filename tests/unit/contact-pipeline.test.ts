import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { handleContact, type ContactEnv } from '../../src/lib/contact-pipeline.ts'
import { resetRateLimits } from '../../src/lib/rate-limit.ts'

// The orchestration the route delegates to: persist → Telegram → forward
// mail → auto-reply. Every channel is independent; one failing never stops
// the others, and the visitor gets `ok` as long as one channel that reaches
// Sherry succeeded. Failures are logged with stable markers for grep.
beforeEach(() => resetRateLimits())

const data = { name: 'Jane Doe', email: 'jane@example.com', message: 'Hi Shehryar, could we set up a demo of the receptionist next week?' }
const meta = { ip: '203.0.113.9', userAgent: 'UA/1.0' }
const fullEnv: ContactEnv = {
  SUPABASE_URL: 'https://proj.supabase.co',
  SUPABASE_KEY: 'sb_secret_test',
  TELEGRAM_BOT_TOKEN: '123:abc',
  TELEGRAM_CHAT_ID: '4242',
  RESEND_API_KEY: 're_test',
  CONTACT_EMAIL_TO: 'owner@example.com',
  CONTACT_EMAIL_FROM: 'portfolio@sherrybuilds.com',
}

type Route = 'supabase' | 'telegram' | 'resend'
function harness(fail: Partial<Record<Route, boolean>> = {}) {
  const calls: { route: Route; body: Record<string, unknown> }[] = []
  const errors: string[] = []
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url)
    const route: Route = u.includes('supabase.co') ? 'supabase' : u.includes('api.telegram.org') ? 'telegram' : 'resend'
    calls.push({ route, body: JSON.parse(String(init?.body ?? '{}')) })
    if (fail[route]) return new Response('{"error":"down"}', { status: 500 })
    if (route === 'supabase') return new Response('[{"id":"uuid-1"}]', { status: 201 })
    return new Response('{"ok":true,"id":"m1"}', { status: 200 })
  }) as typeof globalThis.fetch
  const deps = { fetch: fetchImpl, sleep: async () => {}, log: { error: (...a: unknown[]) => errors.push(a.map(String).join(' ')) } }
  const of = (route: Route) => calls.filter((c) => c.route === route)
  return { deps, calls, errors, of }
}

test('happy path: persisted, notified, forwarded, auto-replied, delivered', async () => {
  const h = harness()
  const r = await handleContact(data, meta, fullEnv, h.deps)
  assert.equal(r.delivered, true)
  assert.equal(r.id, 'uuid-1')
  assert.deepEqual([r.persisted, r.notified, r.forwarded, r.autoReplied], [true, true, true, true])
  assert.equal(h.of('supabase').length, 1)
  assert.equal(h.of('telegram').length, 1)
  assert.match(String(h.of('telegram')[0].body.text), /uuid-1/)
  const mails = h.of('resend')
  assert.equal(mails.length, 2)
  assert.deepEqual(mails[0].body.to, ['owner@example.com'])
  assert.deepEqual(mails[1].body.to, ['jane@example.com'])
  assert.deepEqual(h.errors, [])
})

test('Telegram down: still persisted, still delivered, failure logged with the row id', async () => {
  const h = harness({ telegram: true })
  const r = await handleContact(data, meta, fullEnv, h.deps)
  assert.equal(r.delivered, true)
  assert.equal(r.persisted, true)
  assert.equal(r.notified, false)
  assert.equal(h.errors.length, 1)
  assert.match(h.errors[0], /\[contact\] NOTIFY-FAIL/)
  assert.match(h.errors[0], /uuid-1/)
})

test('Supabase down: Telegram still fires with the message, delivered, failure logged', async () => {
  const h = harness({ supabase: true })
  const r = await handleContact(data, meta, fullEnv, h.deps)
  assert.equal(r.delivered, true)
  assert.equal(r.persisted, false)
  assert.equal(r.notified, true)
  assert.match(String(h.of('telegram')[0].body.text), /could we set up a demo/)
  assert.match(h.errors[0], /\[contact\] PERSIST-FAIL/)
})

test('no mail provider: forward and auto-reply are skipped and noted, not failed', async () => {
  const h = harness()
  const env = { ...fullEnv, RESEND_API_KEY: undefined }
  const r = await handleContact(data, meta, env, h.deps)
  assert.equal(r.delivered, true)
  assert.equal(r.forwarded, false)
  assert.equal(r.autoReplied, false)
  assert.equal(h.of('resend').length, 0)
  assert.ok(r.skipped.includes('forward:no-mail-provider'))
  assert.ok(r.skipped.includes('autoreply:no-mail-provider'))
  assert.deepEqual(h.errors, [])
})

test('spam-looking input is persisted and notified but gets no auto-reply', async () => {
  const h = harness()
  const spam = { ...data, message: 'cheap SEO backlinks http://a.example http://b.example http://c.example' }
  const r = await handleContact(spam, meta, fullEnv, h.deps)
  assert.equal(r.persisted, true)
  assert.equal(r.notified, true)
  assert.equal(r.autoReplied, false)
  assert.ok(r.skipped.includes('autoreply:spam'))
  assert.equal(h.of('resend').length, 1, 'forward only')
})

test('second message from the same address within the hour gets no second auto-reply', async () => {
  const h = harness()
  await handleContact(data, meta, fullEnv, h.deps)
  const r = await handleContact(data, meta, fullEnv, h.deps)
  assert.equal(r.autoReplied, false)
  assert.ok(r.skipped.includes('autoreply:rate-limited'))
  assert.equal(h.of('resend').length, 3, 'two forwards, one auto-reply')
})

test('nothing configured: not delivered, NO-CHANNEL logged with the message', async () => {
  const h = harness()
  const r = await handleContact(data, meta, {}, h.deps)
  assert.equal(r.delivered, false)
  assert.equal(h.calls.length, 0)
  assert.equal(h.errors.length, 1)
  assert.match(h.errors[0], /\[contact\] NO-CHANNEL/)
  assert.match(h.errors[0], /jane@example\.com/)
})

test('every channel down: not delivered, LOST line keeps the full message in the log', async () => {
  const h = harness({ supabase: true, telegram: true, resend: true })
  const r = await handleContact(data, meta, fullEnv, h.deps)
  assert.equal(r.delivered, false)
  const lost = h.errors.find((e) => e.includes('[contact] LOST'))
  assert.ok(lost, 'LOST marker present')
  assert.match(lost!, /could we set up a demo of the receptionist next week/)
})
