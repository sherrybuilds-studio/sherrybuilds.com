import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeReturnPath } from '../../src/lib/safe-path.ts'

test('same-origin paths pass through', () => {
  assert.equal(safeReturnPath('/os'), '/os')
  assert.equal(safeReturnPath('/api/snapshot?x=1'), '/api/snapshot?x=1')
})

test('off-site and scheme-relative targets fall back to /', () => {
  for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', 'javascript:alert(1)', '', null, undefined, '/x\r\ny']) {
    assert.equal(safeReturnPath(bad), '/', String(bad))
  }
})
