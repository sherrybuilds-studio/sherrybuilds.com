import { test } from 'node:test'
import assert from 'node:assert/strict'
import { persistContact } from '../../src/lib/contact-store.ts'

// Persistence half of the contact pipeline: one PostgREST insert into
// contact_messages with the project's secret key. Never throws — the route
// must keep going (Telegram, mail) whatever Supabase does.
const data = { name: 'Jane Doe', email: 'jane@example.com', message: 'Hello there, I would like a demo please.' }
const meta = { ip: '203.0.113.9', userAgent: 'UA/1.0' }
const cfg = { url: 'https://proj.supabase.co', key: 'sb_secret_test' }

function fakeFetch(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = []
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} })
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  return { fn, calls }
}

test('inserts one row via PostgREST with the secret key and returns the row id', async () => {
  const f = fakeFetch(201, [{ id: 'uuid-1' }])
  const r = await persistContact(data, meta, cfg, f.fn)
  assert.deepEqual(r, { ok: true, id: 'uuid-1' })
  assert.equal(f.calls.length, 1)
  assert.equal(f.calls[0].url, 'https://proj.supabase.co/rest/v1/contact_messages')
  assert.equal(f.calls[0].init.method, 'POST')
  const h = f.calls[0].init.headers as Record<string, string>
  assert.equal(h.apikey, 'sb_secret_test')
  assert.equal(h.Authorization, 'Bearer sb_secret_test')
  assert.equal(h.Prefer, 'return=representation')
  assert.deepEqual(JSON.parse(String(f.calls[0].init.body)), {
    name: 'Jane Doe',
    email: 'jane@example.com',
    message: 'Hello there, I would like a demo please.',
    ip: '203.0.113.9',
    user_agent: 'UA/1.0',
    source: 'sherrybuilds.com',
  })
})

test('a non-2xx answer (table missing, bad key) is reported, not thrown', async () => {
  const f = fakeFetch(404, { code: 'PGRST205', message: "Could not find the table 'public.contact_messages'" })
  const r = await persistContact(data, meta, cfg, f.fn)
  assert.equal(r.ok, false)
  assert.match(r.ok ? '' : r.error, /404/)
  assert.match(r.ok ? '' : r.error, /PGRST205/)
})

test('a network failure is reported, not thrown', async () => {
  const boom = (async () => { throw new TypeError('fetch failed') }) as typeof fetch
  const r = await persistContact(data, meta, cfg, boom)
  assert.equal(r.ok, false)
  assert.match(r.ok ? '' : r.error, /fetch failed/)
})

test('a 2xx without a row body still counts as persisted (id unknown)', async () => {
  const f = fakeFetch(201, [])
  const r = await persistContact(data, meta, cfg, f.fn)
  assert.deepEqual(r, { ok: true, id: null })
})
