import { test } from 'node:test'
import assert from 'node:assert/strict'
import { markNotified, persistContact } from '../../src/lib/contact-store.ts'

// Persistence half of the contact pipeline: one PostgREST insert into
// contact_messages with the project's secret key. The row id is chosen by
// the pipeline (it is also the journal id and the Telegram reference), and
// the insert is idempotent on it so the host-side sweep can replay safely.
// Never throws — the route must keep going whatever Supabase does.
const row = {
  id: '11111111-2222-4333-8444-555555555555',
  name: 'Jane Doe',
  email: 'jane@example.com',
  message: 'Hello there, I would like a demo please.',
  ip: '203.0.113.9',
  user_agent: 'UA/1.0',
  synthetic: false,
  truncated_from: null,
}
const cfg = { url: 'https://proj.supabase.co', key: 'sb_secret_test' }

function fakeFetch(status: number, body = '') {
  const calls: { url: string; init: RequestInit }[] = []
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} })
    return new Response(body || null, { status })
  }) as typeof fetch
  return { fn, calls }
}

test('inserts the row idempotently on its id with the secret key', async () => {
  const f = fakeFetch(201)
  assert.deepEqual(await persistContact(row, cfg, f.fn), { ok: true })
  assert.equal(f.calls.length, 1)
  assert.equal(f.calls[0].url, 'https://proj.supabase.co/rest/v1/contact_messages?on_conflict=id')
  assert.equal(f.calls[0].init.method, 'POST')
  const h = f.calls[0].init.headers as Record<string, string>
  assert.equal(h.apikey, 'sb_secret_test')
  assert.equal(h.Authorization, 'Bearer sb_secret_test')
  assert.equal(h.Prefer, 'resolution=ignore-duplicates,return=minimal')
  assert.deepEqual(JSON.parse(String(f.calls[0].init.body)), { ...row, source: 'sherrybuilds.com' })
})

test('a non-2xx answer (table missing, bad key) is reported, not thrown', async () => {
  const f = fakeFetch(404, '{"code":"PGRST205","message":"Could not find the table"}')
  const r = await persistContact(row, cfg, f.fn)
  assert.equal(r.ok, false)
  assert.match(r.ok ? '' : r.error, /404/)
  assert.match(r.ok ? '' : r.error, /PGRST205/)
})

test('a network failure is reported, not thrown', async () => {
  const boom = (async () => { throw new TypeError('fetch failed') }) as typeof fetch
  const r = await persistContact(row, cfg, boom)
  assert.equal(r.ok, false)
  assert.match(r.ok ? '' : r.error, /fetch failed/)
})

test('markNotified patches notified_at on the row and reports success', async () => {
  const f = fakeFetch(204)
  assert.equal(await markNotified(row.id, '2026-09-11T02:00:05.000Z', cfg, f.fn), true)
  assert.equal(f.calls[0].url, `https://proj.supabase.co/rest/v1/contact_messages?id=eq.${row.id}`)
  assert.equal(f.calls[0].init.method, 'PATCH')
  assert.deepEqual(JSON.parse(String(f.calls[0].init.body)), { notified_at: '2026-09-11T02:00:05.000Z' })
  assert.equal((f.calls[0].init.headers as Record<string, string>).Prefer, 'return=minimal')
})

test('markNotified failure is false, never thrown', async () => {
  assert.equal(await markNotified(row.id, '2026-09-11T02:00:05.000Z', cfg, fakeFetch(500).fn), false)
  const boom = (async () => { throw new TypeError('fetch failed') }) as typeof fetch
  assert.equal(await markNotified(row.id, '2026-09-11T02:00:05.000Z', cfg, boom), false)
})
