import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MESSAGE_CAP, escapeHtml, isSynthetic, truncateMessage } from '../../src/lib/contact-sanitize.ts'

// Input edge cases: oversized text is capped and kept (never dropped), the
// stored form is HTML-escaped with the same mapping as Python's
// html.escape(s, quote=True) so the host-side sweep produces identical rows,
// and the daily watchdog's synthetic submissions are recognised.

test('a message within the cap is returned untouched', () => {
  const m = 'Hi Shehryar, could we set up a demo of the receptionist next week?'
  assert.deepEqual(truncateMessage(m), { message: m, truncatedFrom: null })
})

test('an oversized message is cut at the cap with a marker and the original length kept', () => {
  const m = 'x'.repeat(MESSAGE_CAP + 500)
  const r = truncateMessage(m)
  assert.equal(r.truncatedFrom, MESSAGE_CAP + 500)
  assert.ok(r.message.length <= MESSAGE_CAP, `length ${r.message.length}`)
  assert.match(r.message, /\[…truncated from 8500 chars\]$/)
})

test('escapeHtml matches Python html.escape(s, quote=True) exactly', () => {
  assert.equal(escapeHtml(`<script>alert("x")</script> & 'q'`), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#x27;q&#x27;')
  assert.equal(escapeHtml('plain text 🚀 مرحبا'), 'plain text 🚀 مرحبا')
})

test('a submission is synthetic only with the probe address and the tag together', () => {
  assert.equal(isSynthetic({ name: 'Contact path probe', email: 'probe@sherrybuilds.com', message: '[synthetic-probe] abc123 2026-09-11T06:40:00Z' }), true)
  assert.equal(isSynthetic({ name: 'Jane', email: 'jane@example.com', message: '[synthetic-probe] pretending' }), false)
  assert.equal(isSynthetic({ name: 'Jane', email: 'probe@sherrybuilds.com', message: 'hello there friend' }), false)
})
