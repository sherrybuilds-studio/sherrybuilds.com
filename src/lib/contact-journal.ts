// Write-ahead journal for contact submissions. The pipeline appends a
// `received` line BEFORE any network call and an `outcome` line after, so a
// container restart mid-request, a Supabase outage or a Telegram outage never
// loses what the visitor typed. The host-side sweep (monorepo
// services/self-healer/contact_sweep.py) folds these lines per id, replays
// what is still pending and appends `synced` lines — same format, same file.
//
// Layout: <dir>/<YYYY-MM-DD>.jsonl (UTC day of receipt), dir 0700, files 0600
// (PII). <dir> is a bind mount from the host (deploy/vps-pull-release.sh),
// so it survives container restarts and redeploys. Never throws: a journal
// failure is logged by the caller and the channels still run.

import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export type JournalReceived = {
  id: string
  at: string
  name: string
  email: string
  message: string
  truncated_from: number | null
  ip: string
  user_agent: string
  synthetic: boolean
}

export type JournalOutcome = { id: string; at: string; persisted: boolean; notified: boolean }

export function journalFile(dir: string, when: Date): string {
  return join(dir, `${when.toISOString().slice(0, 10)}.jsonl`)
}

function appendLine(dir: string, at: string, record: Record<string, unknown>): boolean {
  try {
    mkdirSync(dir, { recursive: true, mode: 0o700 })
    appendFileSync(journalFile(dir, new Date(at)), `${JSON.stringify(record)}\n`, { mode: 0o600 })
    return true
  } catch {
    return false
  }
}

export function appendReceived(dir: string, entry: JournalReceived): boolean {
  return appendLine(dir, entry.at, { kind: 'received', ...entry })
}

export function appendOutcome(dir: string, outcome: JournalOutcome): boolean {
  return appendLine(dir, outcome.at, { kind: 'outcome', ...outcome })
}
