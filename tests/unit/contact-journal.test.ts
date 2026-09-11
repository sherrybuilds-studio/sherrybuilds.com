import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { appendOutcome, appendReceived, journalFile } from '../../src/lib/contact-journal.ts'

// Write-ahead journal: every submission is on disk before any network call,
// so a container restart mid-request or a Supabase outage never loses what
// the visitor typed. The host-side sweep (monorepo services/self-healer/
// contact_sweep.py) replays it. Format = one JSON object per line.
const entry = {
  id: '11111111-2222-4333-8444-555555555555',
  at: '2026-09-11T02:00:00.000Z',
  name: 'Jane Doe',
  email: 'jane@example.com',
  message: 'Hello there, I would like a demo please.',
  truncated_from: null,
  ip: '203.0.113.9',
  user_agent: 'UA/1.0',
  synthetic: false,
}
const tmp = () => mkdtempSync(join(tmpdir(), 'contact-journal-'))

test('a received line lands in the UTC day file with mode 600 in a 700 directory', () => {
  const dir = join(tmp(), 'journal')
  assert.equal(appendReceived(dir, entry), true)
  const file = journalFile(dir, new Date('2026-09-11T02:00:00Z'))
  assert.equal(file, join(dir, '2026-09-11.jsonl'))
  assert.equal(statSync(dir).mode & 0o777, 0o700)
  assert.equal(statSync(file).mode & 0o777, 0o600)
  const lines = readFileSync(file, 'utf8').trimEnd().split('\n')
  assert.equal(lines.length, 1)
  assert.deepEqual(JSON.parse(lines[0]), { kind: 'received', ...entry })
})

test('the outcome line follows the received line for the same id', () => {
  const dir = tmp()
  appendReceived(dir, entry)
  assert.equal(appendOutcome(dir, { id: entry.id, at: '2026-09-11T02:00:01.000Z', persisted: false, notified: true }), true)
  const lines = readFileSync(journalFile(dir, new Date('2026-09-11T02:00:01Z')), 'utf8').trimEnd().split('\n')
  assert.equal(lines.length, 2)
  assert.deepEqual(JSON.parse(lines[1]), {
    kind: 'outcome',
    id: entry.id,
    at: '2026-09-11T02:00:01.000Z',
    persisted: false,
    notified: true,
  })
})

test('message text with newlines, emoji and RTL stays one line and round-trips exactly', () => {
  const dir = tmp()
  const message = 'line one\nline two 🚀 مرحبا بالعالم ‮evil‬ "quotes" <b>'
  appendReceived(dir, { ...entry, message })
  const [line] = readFileSync(journalFile(dir, new Date(entry.at)), 'utf8').trimEnd().split('\n')
  assert.equal(JSON.parse(line).message, message)
  assert.equal(readdirSync(dir).length, 1)
})

test('an unwritable directory is reported as false, never thrown', () => {
  const base = tmp()
  const notADir = join(base, 'file')
  writeFileSync(notADir, 'x')
  assert.equal(appendReceived(join(notADir, 'journal'), entry), false)
})
