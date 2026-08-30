import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildContactEmail, headerSafe } from '../../src/lib/contact-email.ts'

// portfolio-next:contact-unthrottled-resend-relay (header-injection half)
test('CR/LF in the name cannot split the subject header', () => {
  const mail = buildContactEmail(
    { name: 'Eve\r\nBcc: victim@example.com', email: 'a@b.co', message: 'hello there friend' },
    'portfolio@sherrybuilds.com',
    'owner@example.com'
  )
  assert.equal(mail.subject, 'Portfolio contact — Eve Bcc: victim@example.com')
  assert.doesNotMatch(mail.subject, /[\r\n]/)
  assert.deepEqual(mail.to, ['owner@example.com'])
})

test('headerSafe strips control characters and trims', () => {
  assert.equal(headerSafe('  x y\tz\n '), 'x yz')
})
