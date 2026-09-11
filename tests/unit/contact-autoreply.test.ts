import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { autoReplyAllowed, buildAutoReply, looksLikeSpam } from '../../src/lib/contact-autoreply.ts'
import { resetRateLimits } from '../../src/lib/rate-limit.ts'

beforeEach(() => resetRateLimits())

const genuine = { name: 'Jane Doe', email: 'jane@example.com', message: 'Hi Shehryar, could we set up a demo of the receptionist next week?' }

test('an ordinary demo request is not spam', () => {
  assert.equal(looksLikeSpam(genuine), false)
})

test('three or more links look like spam', () => {
  const m = { ...genuine, message: 'see http://a.example http://b.example https://c.example for details' }
  assert.equal(looksLikeSpam(m), true)
  const two = { ...genuine, message: 'my site https://a.example and repo https://b.example — happy to demo' }
  assert.equal(looksLikeSpam(two), false)
})

test('html anchors and bbcode look like spam', () => {
  assert.equal(looksLikeSpam({ ...genuine, message: 'Great site <a href="http://x.example">click</a> okay' }), true)
  assert.equal(looksLikeSpam({ ...genuine, message: 'Great site [url=http://x.example]click[/url] okay' }), true)
})

test('a URL in the name field looks like spam', () => {
  assert.equal(looksLikeSpam({ ...genuine, name: 'http://cheap.example' }), true)
  assert.equal(looksLikeSpam({ ...genuine, name: 'www.cheap.example' }), true)
})

test('seo / backlink / casino pitches look like spam', () => {
  assert.equal(looksLikeSpam({ ...genuine, message: 'We offer cheap SEO services and high DA backlinks for your website.' }), true)
  assert.equal(looksLikeSpam({ ...genuine, message: 'Best online casino bonus, claim now!!' }), true)
})

test('auto-reply goes to the visitor from the portfolio address with the demo-on-request framing', () => {
  const mail = buildAutoReply(genuine, 'portfolio@sherrybuilds.com')
  assert.deepEqual(mail.to, ['jane@example.com'])
  assert.equal(mail.from, 'Shehryar Irfan <portfolio@sherrybuilds.com>')
  assert.equal(mail.reply_to, 'sherry.aiops@gmail.com')
  assert.match(mail.subject, /Got your message/)
  assert.match(mail.text, /reply personally within a few hours/)
  assert.match(mail.text, /sherrybuilds\.com\/#evidence/)
  assert.match(mail.text, /sherrybuilds\.com\/#demo/)
  assert.match(mail.text, /^Hi Jane Doe,/)
})

test('a CR/LF in the name cannot break the greeting into extra lines', () => {
  const mail = buildAutoReply({ ...genuine, name: 'Eve\r\nBcc: x@y.z' }, 'portfolio@sherrybuilds.com')
  assert.match(mail.text, /^Hi Eve Bcc: x@y\.z,/)
})

test('one auto-reply per address per hour, case-insensitive', () => {
  const t0 = 1_000_000
  assert.equal(autoReplyAllowed('Jane@Example.com', t0), true)
  assert.equal(autoReplyAllowed('jane@example.com', t0 + 1000), false)
  assert.equal(autoReplyAllowed('jane@example.com', t0 + 60 * 60_000), true)
  assert.equal(autoReplyAllowed('other@example.com', t0 + 2000), true)
})

test('twenty auto-replies per day across all addresses', () => {
  const t0 = 1_000_000
  for (let i = 0; i < 20; i++) assert.equal(autoReplyAllowed(`v${i}@example.com`, t0 + i), true, `reply ${i + 1}`)
  assert.equal(autoReplyAllowed('v99@example.com', t0 + 100), false)
  assert.equal(autoReplyAllowed('v99@example.com', t0 + 24 * 60 * 60_000), true)
})
