// What happens to a valid contact-form submission, in order:
//   0. journal   → write-ahead line on disk (CONTACT_JOURNAL_DIR, a host
//                  bind mount) BEFORE any network call — the lossless copy
//   1. persist   → Supabase contact_messages (SUPABASE_URL + SUPABASE_KEY),
//                  idempotent on the id chosen here
//   2. notify    → Telegram, the digests' bot (TELEGRAM_BOT_TOKEN + _CHAT_ID);
//                  on success the row gets notified_at (the probe's evidence)
//   3. forward   → email to Sherry via Resend (RESEND_API_KEY)
//   4. auto-reply→ acknowledgment to the visitor via Resend, spam- and
//                  rate-gated
//   5. journal   → outcome line (persisted / notified) for the host-side sweep
// Channels are independent: one failing never stops the next. The visitor
// gets `delivered` when at least one channel that reaches Sherry (1–3)
// succeeded; otherwise the route answers 502 so they use the mailto link —
// the journal still holds the message and the sweep replays it.
// Synthetic probe submissions (daily watchdog) persist + notify silently and
// never touch mail. Every failure is logged with a stable marker for grep in
// `docker logs` (counted by the 09:00 brief):
//   [contact] JOURNAL-FAIL / PERSIST-FAIL / NOTIFY-FAIL / FORWARD-FAIL /
//             AUTOREPLY-FAIL / MARK-FAIL
//   [contact] NO-CHANNEL   nothing configured — the message is in the line
//   [contact] LOST         every configured channel failed — ditto

import { randomUUID } from 'node:crypto'
import { buildContactEmail } from './contact-email.ts'
import { autoReplyAllowed, buildAutoReply, looksLikeSpam } from './contact-autoreply.ts'
import { appendOutcome, appendReceived } from './contact-journal.ts'
import { formatContactAlert, notifyTelegram } from './contact-notify.ts'
import { escapeHtml, isSynthetic, truncateMessage } from './contact-sanitize.ts'
import { markNotified, persistContact, type ContactData, type ContactMeta } from './contact-store.ts'

export type ContactEnv = Partial<
  Record<
    | 'SUPABASE_URL'
    | 'SUPABASE_KEY'
    | 'TELEGRAM_BOT_TOKEN'
    | 'TELEGRAM_CHAT_ID'
    | 'RESEND_API_KEY'
    | 'CONTACT_EMAIL_TO'
    | 'CONTACT_EMAIL_FROM'
    | 'CONTACT_JOURNAL_DIR',
    string | undefined
  >
>

export type ContactDeps = {
  fetch?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  log?: { error: (...args: unknown[]) => void }
  now?: () => number
  id?: () => string
}

export type ContactResult = {
  delivered: boolean
  id: string
  synthetic: boolean
  journaled: boolean
  persisted: boolean
  notified: boolean
  forwarded: boolean
  autoReplied: boolean
  skipped: string[]
  failures: string[]
}

const RESEND_URL = 'https://api.resend.com/emails'
const MAIL_TIMEOUT_MS = 10_000
export const DEFAULT_JOURNAL_DIR = 'data/contact-fallback'
export const DEFAULT_EMAIL_TO = 'sherry.aiops@gmail.com'
export const DEFAULT_EMAIL_FROM = 'portfolio@sherrybuilds.com'

async function sendMail(key: string, payload: unknown, fetchImpl: typeof fetch): Promise<string | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), MAIL_TIMEOUT_MS)
  try {
    const res = await fetchImpl(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    })
    if (res.ok) return null
    return `HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}`
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  } finally {
    clearTimeout(timer)
  }
}

export async function handleContact(
  data: ContactData,
  meta: ContactMeta,
  env: ContactEnv,
  deps: ContactDeps = {}
): Promise<ContactResult> {
  const fetchImpl = deps.fetch ?? fetch
  const log = deps.log ?? console
  const now = deps.now ?? Date.now
  const id = (deps.id ?? randomUUID)()
  const synthetic = isSynthetic(data)
  const { message, truncatedFrom } = truncateMessage(data.message)
  const plain: ContactData = { name: data.name, email: data.email, message }
  const journalDir = env.CONTACT_JOURNAL_DIR || DEFAULT_JOURNAL_DIR
  const r: ContactResult = {
    delivered: false,
    id,
    synthetic,
    journaled: false,
    persisted: false,
    notified: false,
    forwarded: false,
    autoReplied: false,
    skipped: [],
    failures: [],
  }
  const summary = `${data.name} <${data.email}> ip=${meta.ip} id=${id}`

  // 0. write-ahead journal — before anything can fail over the network
  r.journaled = appendReceived(journalDir, {
    id,
    at: new Date(now()).toISOString(),
    name: data.name,
    email: data.email,
    message,
    truncated_from: truncatedFrom,
    ip: meta.ip,
    user_agent: meta.userAgent,
    synthetic,
  })
  if (!r.journaled) {
    r.failures.push('journal: write failed')
    log.error(`[contact] JOURNAL-FAIL could not append to ${journalDir} — ${summary}`)
  }

  const hasStore = Boolean(env.SUPABASE_URL && env.SUPABASE_KEY)
  const hasTelegram = Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID)
  const hasMail = Boolean(env.RESEND_API_KEY)
  const finish = () => {
    appendOutcome(journalDir, { id, at: new Date(now()).toISOString(), persisted: r.persisted, notified: r.notified })
    r.delivered = r.persisted || r.notified || r.forwarded
    return r
  }

  if (!hasStore && !hasTelegram && !hasMail) {
    log.error(`[contact] NO-CHANNEL no SUPABASE/TELEGRAM/RESEND env — message from ${summary}:\n${message}`)
    r.skipped.push('persist:unconfigured', 'notify:unconfigured', 'forward:no-mail-provider', 'autoreply:no-mail-provider')
    return finish()
  }

  // 1. persist — storage form: capped + HTML-escaped
  const storeCfg = { url: env.SUPABASE_URL ?? '', key: env.SUPABASE_KEY ?? '' }
  if (hasStore) {
    const stored = await persistContact(
      {
        id,
        name: escapeHtml(data.name),
        email: data.email,
        message: escapeHtml(message),
        ip: meta.ip,
        user_agent: meta.userAgent,
        synthetic,
        truncated_from: truncatedFrom,
      },
      storeCfg,
      fetchImpl
    )
    if (stored.ok) r.persisted = true
    else {
      r.failures.push(`persist: ${stored.error}`)
      log.error(`[contact] PERSIST-FAIL ${stored.error} — ${summary}`)
    }
  } else {
    r.skipped.push('persist:unconfigured')
  }

  // 2. notify — plain text; silent for the daily probe
  if (hasTelegram) {
    const text = formatContactAlert(plain, { id, ip: meta.ip, synthetic })
    const sent = await notifyTelegram(
      text,
      { token: env.TELEGRAM_BOT_TOKEN ?? '', chatId: env.TELEGRAM_CHAT_ID ?? '' },
      { fetch: fetchImpl, sleep: deps.sleep },
      { silent: synthetic }
    )
    if (sent) {
      r.notified = true
      if (r.persisted && !(await markNotified(id, new Date(now()).toISOString(), storeCfg, fetchImpl))) {
        log.error(`[contact] MARK-FAIL notified_at not stamped — ${summary}`)
      }
    } else {
      r.failures.push('notify: telegram send failed')
      log.error(`[contact] NOTIFY-FAIL telegram send failed after retries — ${summary}`)
    }
  } else {
    r.skipped.push('notify:unconfigured')
  }

  // 3. forward + 4. auto-reply — never for the synthetic probe
  if (synthetic) {
    r.skipped.push('forward:synthetic', 'autoreply:synthetic')
  } else if (hasMail) {
    const key = env.RESEND_API_KEY ?? ''
    const to = env.CONTACT_EMAIL_TO || DEFAULT_EMAIL_TO
    const from = env.CONTACT_EMAIL_FROM || DEFAULT_EMAIL_FROM
    const fwdErr = await sendMail(key, buildContactEmail(plain, from, to), fetchImpl)
    if (fwdErr === null) r.forwarded = true
    else {
      r.failures.push(`forward: ${fwdErr}`)
      log.error(`[contact] FORWARD-FAIL ${fwdErr} — ${summary}`)
    }

    if (looksLikeSpam(plain)) r.skipped.push('autoreply:spam')
    else if (!autoReplyAllowed(data.email, now())) r.skipped.push('autoreply:rate-limited')
    else {
      const ackErr = await sendMail(key, buildAutoReply(plain, from), fetchImpl)
      if (ackErr === null) r.autoReplied = true
      else {
        r.failures.push(`autoreply: ${ackErr}`)
        log.error(`[contact] AUTOREPLY-FAIL ${ackErr} — ${summary}`)
      }
    }
  } else {
    r.skipped.push('forward:no-mail-provider', 'autoreply:no-mail-provider')
  }

  finish()
  if (!r.delivered) {
    log.error(`[contact] LOST every configured channel failed (${r.failures.join('; ')}) — message from ${summary}:\n${message}`)
  }
  return r
}
