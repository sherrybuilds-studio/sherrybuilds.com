import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { handleContact, type ContactEnv } from '../../src/lib/contact-pipeline.ts'
import { resetRateLimits } from '../../src/lib/rate-limit.ts'

// The orchestration the route delegates to: journal (write-ahead) → persist
// → Telegram → forward mail → auto-reply. Every channel is independent; one
// failing never stops the others, and the visitor gets `delivered` as long as
// one channel that reaches Sherry succeeded. The journal keeps what they
// typed in every case. Failures are logged with stable markers for grep.
beforeEach(() => resetRateLimits())

const ID = '11111111-2222-4333-8444-555555555555'
const T0 = Date.parse('2026-09-11T02:00:00Z')
const data = { name: 'Jane Doe', email: 'jane@example.com', message: 'Hi Shehryar, could we set up a demo of the receptionist next week?' }
const meta = { ip: '203.0.113.9', userAgent: 'UA/1.0' }
const channels = {
  SUPABASE_URL: 'https://proj.supabase.co',
  SUPABASE_KEY: 'sb_secret_test',
  TELEGRAM_BOT_TOKEN: '123:abc',
  TELEGRAM_CHAT_ID: '4242',
  RESEND_API_KEY: 're_test',
  CONTACT_EMAIL_TO: 'owner@example.com',
  CONTACT_EMAIL_FROM: 'portfolio@sherrybuilds.com',
}

type Route = 'supabase' | 'patch' | 'telegram' | 'resend'
function harness(fail: Partial<Record<Route, boolean>> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'contact-pipeline-'))
  const env: ContactEnv = { ...channels, CONTACT_JOURNAL_DIR: dir }
  const calls: { route: Route; url: string; body: Record<string, unknown>; journalHadIdAtCall: boolean }[] = []
  const errors: string[] = []
  const journal = () => {
    try {
      return readFileSync(join(dir, '2026-09-11.jsonl'), 'utf8').trimEnd().split('\n').map((l) => JSON.parse(l))
    } catch {
      return [] as Record<string, unknown>[]
    }
  }
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url)
    const route: Route = u.includes('api.telegram.org') ? 'telegram' : u.includes('resend') ? 'resend' : init?.method === 'PATCH' ? 'patch' : 'supabase'
    calls.push({
      route,
      url: u,
      body: JSON.parse(String(init?.body ?? '{}')),
      journalHadIdAtCall: journal().some((l) => l.kind === 'received' && l.id === ID),
    })
    if (fail[route]) return new Response('{"error":"down"}', { status: 500 })
    if (route === 'supabase' || route === 'patch') return new Response(null, { status: 204 })
    return new Response('{"ok":true,"id":"m1"}', { status: 200 })
  }) as typeof globalThis.fetch
  let t = T0
  const deps = {
    fetch: fetchImpl,
    sleep: async () => {},
    log: { error: (...a: unknown[]) => errors.push(a.map(String).join(' ')) },
    now: () => (t += 1000),
    id: () => ID,
  }
  const of = (route: Route) => calls.filter((c) => c.route === route)
  return { dir, env, deps, calls, errors, of, journal }
}

test('happy path: journaled first, then persisted, notified, marked, forwarded, auto-replied', async () => {
  const h = harness()
  const r = await handleContact(data, meta, h.env, h.deps)
  assert.equal(r.delivered, true)
  assert.equal(r.id, ID)
  assert.deepEqual([r.journaled, r.persisted, r.notified, r.forwarded, r.autoReplied], [true, true, true, true, true])
  assert.ok(h.calls.every((c) => c.journalHadIdAtCall), 'the received line is on disk before any network call')
  assert.equal(h.of('supabase').length, 1)
  assert.equal(h.of('supabase')[0].body.id, ID)
  assert.equal(h.of('telegram').length, 1)
  assert.match(String(h.of('telegram')[0].body.text), new RegExp(ID))
  assert.equal(h.of('patch').length, 1, 'notified_at stamped after the Telegram send')
  assert.match(h.of('patch')[0].url, new RegExp(`id=eq\\.${ID}$`))
  const mails = h.of('resend')
  assert.equal(mails.length, 2)
  assert.deepEqual(mails[0].body.to, ['owner@example.com'])
  assert.deepEqual(mails[1].body.to, ['jane@example.com'])
  const lines = h.journal()
  assert.equal(lines.length, 2)
  assert.equal(lines[0].kind, 'received')
  assert.deepEqual(lines[1], { kind: 'outcome', id: ID, at: lines[1].at, persisted: true, notified: true })
  assert.deepEqual(h.errors, [])
})

test('Telegram down: still persisted and delivered, NOTIFY-FAIL logged with the id, outcome says notified=false', async () => {
  const h = harness({ telegram: true })
  const r = await handleContact(data, meta, h.env, h.deps)
  assert.equal(r.delivered, true)
  assert.equal(r.persisted, true)
  assert.equal(r.notified, false)
  assert.equal(h.of('patch').length, 0)
  assert.equal(h.errors.length, 1)
  assert.match(h.errors[0], /\[contact\] NOTIFY-FAIL/)
  assert.match(h.errors[0], new RegExp(ID))
  assert.deepEqual(h.journal().at(-1), { kind: 'outcome', id: ID, at: h.journal().at(-1)!.at, persisted: true, notified: false })
})

test('Supabase down: Telegram still fires with the message, delivered, PERSIST-FAIL logged, outcome says persisted=false', async () => {
  const h = harness({ supabase: true })
  const r = await handleContact(data, meta, h.env, h.deps)
  assert.equal(r.delivered, true)
  assert.equal(r.persisted, false)
  assert.equal(r.notified, true)
  assert.match(String(h.of('telegram')[0].body.text), /could we set up a demo/)
  assert.equal(h.of('patch').length, 0, 'no row to stamp')
  assert.match(h.errors[0], /\[contact\] PERSIST-FAIL/)
  assert.equal(h.journal().at(-1)!.persisted, false)
})

test('Supabase and Telegram both down: not delivered, LOST logged, but the journal keeps what they typed', async () => {
  const h = harness({ supabase: true, telegram: true, resend: true })
  const r = await handleContact(data, meta, h.env, h.deps)
  assert.equal(r.delivered, false)
  const lost = h.errors.find((e) => e.includes('[contact] LOST'))
  assert.ok(lost, 'LOST marker present')
  assert.match(lost!, /could we set up a demo of the receptionist next week/)
  const [received, outcome] = h.journal()
  assert.equal(received.message, data.message)
  assert.deepEqual([outcome.persisted, outcome.notified], [false, false])
})

test('nothing configured: not delivered, NO-CHANNEL logged, journal still has the message', async () => {
  const h = harness()
  const r = await handleContact(data, meta, { CONTACT_JOURNAL_DIR: h.dir }, h.deps)
  assert.equal(r.delivered, false)
  assert.equal(r.journaled, true)
  assert.equal(h.calls.length, 0)
  assert.match(h.errors[0], /\[contact\] NO-CHANNEL/)
  assert.equal(h.journal()[0].email, 'jane@example.com')
})

test('journal directory unwritable: JOURNAL-FAIL logged, every channel still runs, delivered', async () => {
  const h = harness()
  const notADir = join(h.dir, 'blocker')
  writeFileSync(notADir, 'x')
  const r = await handleContact(data, meta, { ...h.env, CONTACT_JOURNAL_DIR: join(notADir, 'journal') }, h.deps)
  assert.equal(r.journaled, false)
  assert.equal(r.delivered, true)
  assert.equal(r.persisted, true)
  assert.equal(r.notified, true)
  assert.equal(h.errors.filter((e) => e.includes('[contact] JOURNAL-FAIL')).length, 1)
})

test('synthetic probe: silent Telegram with the probe header, persisted with synthetic=true, no mail at all', async () => {
  const h = harness()
  const probe = { name: 'Contact path probe', email: 'probe@sherrybuilds.com', message: '[synthetic-probe] abc123 2026-09-11T06:40:00Z' }
  const r = await handleContact(probe, meta, h.env, h.deps)
  assert.equal(r.delivered, true)
  assert.equal(r.synthetic, true)
  assert.equal(h.of('supabase')[0].body.synthetic, true)
  assert.equal(h.of('telegram')[0].body.disable_notification, true)
  assert.match(String(h.of('telegram')[0].body.text), /^🧪 Portfolio contact probe/)
  assert.equal(h.of('patch').length, 1)
  assert.equal(h.of('resend').length, 0)
  assert.ok(r.skipped.includes('forward:synthetic'))
  assert.ok(r.skipped.includes('autoreply:synthetic'))
  assert.equal(h.journal()[0].synthetic, true)
})

test('oversized message is kept, not dropped: capped in the row, marked, original length recorded', async () => {
  const h = harness()
  const big = { ...data, message: 'y'.repeat(9000) }
  const r = await handleContact(big, meta, h.env, h.deps)
  assert.equal(r.delivered, true)
  const row = h.of('supabase')[0].body
  assert.ok(String(row.message).length <= 8000)
  assert.match(String(row.message), /\[…truncated from 9000 chars\]$/)
  assert.equal(row.truncated_from, 9000)
  assert.equal(h.journal()[0].truncated_from, 9000)
  assert.ok(String(h.of('telegram')[0].body.text).length < 900)
})

test('HTML injection attempt: stored escaped, alerted plain, journaled raw', async () => {
  const h = harness()
  const evil = { ...data, name: 'Eve <b>bold</b>', message: '<script>alert("x")</script> & friends' }
  await handleContact(evil, meta, h.env, h.deps)
  const row = h.of('supabase')[0].body
  assert.equal(row.name, 'Eve &lt;b&gt;bold&lt;/b&gt;')
  assert.equal(row.message, '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; friends')
  assert.match(String(h.of('telegram')[0].body.text), /<script>alert\("x"\)<\/script> & friends/)
  assert.equal(h.journal()[0].message, evil.message)
})

test('emoji and RTL text land intact in the row, the alert and the journal', async () => {
  const h = harness()
  const intl = { ...data, name: 'Zoë 🚀', message: 'مرحبا بالعالم — שלום עולם — 日本語 🚀🎉 fine' }
  await handleContact(intl, meta, h.env, h.deps)
  assert.equal(h.of('supabase')[0].body.message, intl.message)
  assert.equal(h.of('supabase')[0].body.name, intl.name)
  assert.match(String(h.of('telegram')[0].body.text), /مرحبا بالعالم — שלום עולם — 日本語 🚀🎉 fine/)
  assert.equal(h.journal()[0].message, intl.message)
})

test('no mail provider: forward and auto-reply are skipped and noted, not failed', async () => {
  const h = harness()
  const r = await handleContact(data, meta, { ...h.env, RESEND_API_KEY: undefined }, h.deps)
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
  const r = await handleContact(spam, meta, h.env, h.deps)
  assert.equal(r.persisted, true)
  assert.equal(r.notified, true)
  assert.equal(r.autoReplied, false)
  assert.ok(r.skipped.includes('autoreply:spam'))
  assert.equal(h.of('resend').length, 1, 'forward only')
})

test('second message from the same address within the hour gets no second auto-reply', async () => {
  const h = harness()
  await handleContact(data, meta, h.env, h.deps)
  const r = await handleContact(data, meta, h.env, h.deps)
  assert.equal(r.autoReplied, false)
  assert.ok(r.skipped.includes('autoreply:rate-limited'))
  assert.equal(h.of('resend').length, 3, 'two forwards, one auto-reply')
})
