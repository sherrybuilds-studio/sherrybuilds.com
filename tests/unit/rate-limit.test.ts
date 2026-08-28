import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { clientIp, rateLimit, resetRateLimits } from '../../src/lib/rate-limit.ts'

beforeEach(() => resetRateLimits())

test('allows `limit` hits in a window, rejects the next one', () => {
  const t0 = 1_000_000
  for (let i = 0; i < 3; i++) assert.equal(rateLimit('k', 3, 1000, t0 + i), true, `hit ${i + 1}`)
  assert.equal(rateLimit('k', 3, 1000, t0 + 10), false)
})

test('window expiry resets the bucket', () => {
  const t0 = 1_000_000
  for (let i = 0; i < 3; i++) rateLimit('k', 3, 1000, t0)
  assert.equal(rateLimit('k', 3, 1000, t0 + 999), false)
  assert.equal(rateLimit('k', 3, 1000, t0 + 1000), true)
})

test('buckets are independent per key', () => {
  for (let i = 0; i < 3; i++) rateLimit('a', 3, 1000, 0)
  assert.equal(rateLimit('a', 3, 1000, 1), false)
  assert.equal(rateLimit('b', 3, 1000, 1), true)
})

test('clientIp trusts only cf-connecting-ip, never X-Forwarded-For', () => {
  const mk = (h: Record<string, string>) => new Request('http://x/', { headers: h })
  assert.equal(clientIp(mk({ 'cf-connecting-ip': ' 203.0.113.9 ' })), '203.0.113.9')
  assert.equal(clientIp(mk({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' })), 'unknown')
  assert.equal(clientIp(mk({})), 'unknown')
})
