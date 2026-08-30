import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer, type Server } from 'node:http'
import { post, skipReason } from './_server.ts'

// portfolio-next:chat-forwards-client-xff
// A fake chat backend on :3201 records the X-Forwarded-For header the
// Next proxy sends upstream. Start the app with
//   CHAT_BACKEND_URL=http://127.0.0.1:3201
// for these to be meaningful; otherwise they skip.
const seen: string[] = []
let backend: Server | undefined

before(() => {
  if (skipReason) return
  backend = createServer((req, res) => {
    seen.push(req.headers['x-forwarded-for'] as string)
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ answer: 'stub', citations: [] }))
  }).listen(3201, '127.0.0.1')
})
after(() => backend?.close())

const ip = (n: number) => ({ 'cf-connecting-ip': `203.0.113.${100 + n}` })

const NOT_WIRED = 'app not started with CHAT_BACKEND_URL=http://127.0.0.1:3201'

test('client X-Forwarded-For is never forwarded as the upstream rate-limit key', { skip: skipReason }, async (t) => {
  const res = await post('/api/chat', { question: 'hi' }, { 'x-forwarded-for': '198.51.100.77' })
  if (seen.length === 0) return t.skip(NOT_WIRED)
  assert.equal(res.status, 200)
  assert.equal(seen.at(-1), 'unknown', 'spoofed XFF leaked upstream')
})

test('cf-connecting-ip is what goes upstream', { skip: skipReason }, async (t) => {
  if (seen.length === 0) return t.skip(NOT_WIRED)
  await post('/api/chat', { question: 'hi' }, { ...ip(1), 'x-forwarded-for': '198.51.100.77' })
  assert.equal(seen.at(-1), '203.0.113.101')
})

test('21st question per minute from one IP is throttled locally (429)', { skip: skipReason }, async (t) => {
  if (seen.length === 0) return t.skip(NOT_WIRED)
  for (let i = 0; i < 20; i++) {
    assert.equal((await post('/api/chat', { question: 'q' }, ip(2))).status, 200, `q ${i + 1}`)
  }
  const n = seen.length
  const res = await post('/api/chat', { question: 'q' }, ip(2))
  assert.equal(res.status, 429)
  assert.equal(seen.length, n, 'throttled request must not reach the backend')
})
