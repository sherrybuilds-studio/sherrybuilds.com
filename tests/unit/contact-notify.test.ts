import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatContactAlert, notifyTelegram, MAX_MESSAGE_LEN } from '../../src/lib/contact-notify.ts'

// Telegram half of the contact pipeline. Same bot + owner chat as the
// monorepo's sherry_core.telegram (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID),
// same rules: plain text, 4096 cap with a marker, retry transient errors,
// never retry a 4xx, never throw.
const cfg = { token: '123:abc', chatId: '4242' }
const data = { name: 'Jane Doe', email: 'jane@example.com', message: 'Hello there, I would like a demo please.' }
const noSleep = async () => {}

function scripted(responses: (Response | Error)[]) {
  const calls: { url: string; body: Record<string, unknown> }[] = []
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body ?? '{}')) })
    const next = responses.shift()
    if (!next) throw new Error('fake fetch: no scripted response left')
    if (next instanceof Error) throw next
    return next
  }) as typeof fetch
  return { fn, calls }
}
const ok = () => new Response('{"ok":true}', { status: 200 })
const status = (s: number, body = '{}') => new Response(body, { status: s })

test('alert carries name, email, a message preview and the row id', () => {
  const text = formatContactAlert(data, { id: 'uuid-1', ip: '203.0.113.9' })
  assert.match(text, /Portfolio contact/)
  assert.match(text, /Jane Doe/)
  assert.match(text, /jane@example\.com/)
  assert.match(text, /Hello there, I would like a demo please\./)
  assert.match(text, /uuid-1/)
  assert.match(text, /203\.0\.113\.9/)
})

test('long messages are previewed, not pasted whole', () => {
  const long = { ...data, message: 'x'.repeat(2000) }
  const text = formatContactAlert(long, { id: null, ip: 'unknown' })
  assert.ok(text.length < 900, `alert is ${text.length} chars`)
  assert.match(text, /…/)
})

test('sends plain text to the owner chat through sendMessage', async () => {
  const f = scripted([ok()])
  assert.equal(await notifyTelegram('hello', cfg, { fetch: f.fn, sleep: noSleep }), true)
  assert.equal(f.calls.length, 1)
  assert.equal(f.calls[0].url, 'https://api.telegram.org/bot123:abc/sendMessage')
  assert.deepEqual(f.calls[0].body, { chat_id: '4242', text: 'hello' })
})

test('retries 5xx and network errors, then gives up after 3 attempts', async () => {
  const f = scripted([status(502), new TypeError('fetch failed'), status(500)])
  assert.equal(await notifyTelegram('hello', cfg, { fetch: f.fn, sleep: noSleep }), false)
  assert.equal(f.calls.length, 3)
})

test('a transient failure followed by success is a success', async () => {
  const f = scripted([status(503), ok()])
  assert.equal(await notifyTelegram('hello', cfg, { fetch: f.fn, sleep: noSleep }), true)
  assert.equal(f.calls.length, 2)
})

test('a 4xx (bad chat id, bad token) is not retried', async () => {
  const f = scripted([status(400, '{"ok":false,"description":"chat not found"}')])
  assert.equal(await notifyTelegram('hello', cfg, { fetch: f.fn, sleep: noSleep }), false)
  assert.equal(f.calls.length, 1)
})

test('429 waits for retry_after and tries again', async () => {
  const waits: number[] = []
  const f = scripted([status(429, '{"parameters":{"retry_after":1}}'), ok()])
  const r = await notifyTelegram('hello', cfg, { fetch: f.fn, sleep: async (ms) => { waits.push(ms) } })
  assert.equal(r, true)
  assert.deepEqual(waits, [1000])
})

test('text beyond the 4096 limit is truncated with a marker', async () => {
  const f = scripted([ok()])
  await notifyTelegram('y'.repeat(5000), cfg, { fetch: f.fn, sleep: noSleep })
  const sent = String(f.calls[0].body.text)
  assert.equal(sent.length, MAX_MESSAGE_LEN)
  assert.match(sent, /\[…truncated\]$/)
})
