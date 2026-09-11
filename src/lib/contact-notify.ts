// Telegram half of the contact pipeline. Same bot and owner chat as the
// monorepo's sherry_core.telegram (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID —
// the digests' bot), and the same rules learned there: plain text (user
// input never goes through a parse_mode), 4096-char cap with a marker,
// retry transient failures (5xx, network, 429 with retry_after), never
// retry a 4xx, never throw. Backoff is short because a visitor is waiting
// on the HTTP response.

import type { ContactData } from './contact-store.ts'

export const MAX_MESSAGE_LEN = 4096
const TRUNCATION_MARK = '\n\n[…truncated]'
const PREVIEW_CHARS = 600
const MAX_ATTEMPTS = 3
const BACKOFF_MS = [500, 1000]
const TIMEOUT_MS = 10_000

export type TelegramConfig = { token: string; chatId: string }
export type NotifyDeps = { fetch?: typeof fetch; sleep?: (ms: number) => Promise<void> }

export function formatContactAlert(data: ContactData, ctx: { id: string | null; ip: string }): string {
  const preview =
    data.message.length > PREVIEW_CHARS ? `${data.message.slice(0, PREVIEW_CHARS)}…` : data.message
  return [
    '📬 Portfolio contact',
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    '',
    preview,
    '',
    `id: ${ctx.id ?? 'not persisted'} · ip: ${ctx.ip}`,
  ].join('\n')
}

export async function notifyTelegram(text: string, cfg: TelegramConfig, deps: NotifyDeps = {}): Promise<boolean> {
  const fetchImpl = deps.fetch ?? fetch
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const msg =
    text.length > MAX_MESSAGE_LEN ? text.slice(0, MAX_MESSAGE_LEN - TRUNCATION_MARK.length) + TRUNCATION_MARK : text
  const url = `https://api.telegram.org/bot${cfg.token}/sendMessage`
  const body = JSON.stringify({ chat_id: cfg.chatId, text: msg })

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: ctrl.signal,
      })
      if (res.ok) return true
      if (res.status === 429) {
        const parsed = (await res.json().catch(() => ({}))) as { parameters?: { retry_after?: number } }
        const retryAfter = Number(parsed.parameters?.retry_after ?? 1)
        if (attempt < MAX_ATTEMPTS) await sleep(Math.min(retryAfter, 30) * 1000)
        continue
      }
      // 4xx: bad chat id / token / payload — retrying cannot help.
      if (res.status < 500) return false
      // 5xx falls through to the backoff below.
    } catch {
      // network error or timeout — transient, retry
    } finally {
      clearTimeout(timer)
    }
    if (attempt < MAX_ATTEMPTS) await sleep(BACKOFF_MS[attempt - 1])
  }
  return false
}
