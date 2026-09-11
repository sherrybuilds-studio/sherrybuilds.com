// What happens to a valid contact-form submission, in order:
//   1. persist   → Supabase contact_messages (SUPABASE_URL + SUPABASE_KEY)
//   2. notify    → Telegram, the digests' bot (TELEGRAM_BOT_TOKEN + _CHAT_ID)
//   3. forward   → email to Sherry via Resend (RESEND_API_KEY)
//   4. auto-reply→ acknowledgment to the visitor via Resend, spam- and
//                  rate-gated
// Channels are independent: one failing never stops the next. The visitor
// gets `delivered` when at least one channel that reaches Sherry (1–3)
// succeeded; otherwise the route answers 502 so they use the mailto link.
// Every failure is logged with a stable marker for grep in `docker logs`:
//   [contact] PERSIST-FAIL / NOTIFY-FAIL / FORWARD-FAIL / AUTOREPLY-FAIL
//   [contact] NO-CHANNEL   nothing configured — the message is in the line
//   [contact] LOST         every configured channel failed — ditto

import { buildContactEmail } from './contact-email.ts'
import { autoReplyAllowed, buildAutoReply, looksLikeSpam } from './contact-autoreply.ts'
import { formatContactAlert, notifyTelegram } from './contact-notify.ts'
import { persistContact, type ContactData, type ContactMeta } from './contact-store.ts'

export type ContactEnv = Partial<
  Record<
    | 'SUPABASE_URL'
    | 'SUPABASE_KEY'
    | 'TELEGRAM_BOT_TOKEN'
    | 'TELEGRAM_CHAT_ID'
    | 'RESEND_API_KEY'
    | 'CONTACT_EMAIL_TO'
    | 'CONTACT_EMAIL_FROM',
    string | undefined
  >
>

export type ContactDeps = {
  fetch?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  log?: { error: (...args: unknown[]) => void }
  now?: () => number
}

export type ContactResult = {
  delivered: boolean
  id: string | null
  persisted: boolean
  notified: boolean
  forwarded: boolean
  autoReplied: boolean
  skipped: string[]
  failures: string[]
}

const RESEND_URL = 'https://api.resend.com/emails'
const MAIL_TIMEOUT_MS = 10_000
export const DEFAULT_EMAIL_TO = 'codewithsherry1@gmail.com'
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
  const r: ContactResult = {
    delivered: false,
    id: null,
    persisted: false,
    notified: false,
    forwarded: false,
    autoReplied: false,
    skipped: [],
    failures: [],
  }
  const summary = `${data.name} <${data.email}> ip=${meta.ip}`

  const hasStore = Boolean(env.SUPABASE_URL && env.SUPABASE_KEY)
  const hasTelegram = Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID)
  const hasMail = Boolean(env.RESEND_API_KEY)

  if (!hasStore && !hasTelegram && !hasMail) {
    log.error(`[contact] NO-CHANNEL no SUPABASE/TELEGRAM/RESEND env — message from ${summary}:\n${data.message}`)
    r.skipped.push('persist:unconfigured', 'notify:unconfigured', 'forward:no-mail-provider', 'autoreply:no-mail-provider')
    return r
  }

  // 1. persist
  if (hasStore) {
    const stored = await persistContact(data, meta, { url: env.SUPABASE_URL!, key: env.SUPABASE_KEY! }, fetchImpl)
    if (stored.ok) {
      r.persisted = true
      r.id = stored.id
    } else {
      r.failures.push(`persist: ${stored.error}`)
      log.error(`[contact] PERSIST-FAIL ${stored.error} — ${summary}`)
    }
  } else {
    r.skipped.push('persist:unconfigured')
  }

  // 2. notify
  if (hasTelegram) {
    const text = formatContactAlert(data, { id: r.id, ip: meta.ip })
    const sent = await notifyTelegram(text, { token: env.TELEGRAM_BOT_TOKEN!, chatId: env.TELEGRAM_CHAT_ID! }, {
      fetch: fetchImpl,
      sleep: deps.sleep,
    })
    if (sent) r.notified = true
    else {
      r.failures.push('notify: telegram send failed')
      log.error(`[contact] NOTIFY-FAIL telegram send failed after retries — row id=${r.id ?? 'none'} ${summary}`)
    }
  } else {
    r.skipped.push('notify:unconfigured')
  }

  // 3. forward + 4. auto-reply
  if (hasMail) {
    const to = env.CONTACT_EMAIL_TO || DEFAULT_EMAIL_TO
    const from = env.CONTACT_EMAIL_FROM || DEFAULT_EMAIL_FROM
    const fwdErr = await sendMail(env.RESEND_API_KEY!, buildContactEmail(data, from, to), fetchImpl)
    if (fwdErr === null) r.forwarded = true
    else {
      r.failures.push(`forward: ${fwdErr}`)
      log.error(`[contact] FORWARD-FAIL ${fwdErr} — row id=${r.id ?? 'none'} ${summary}`)
    }

    if (looksLikeSpam(data)) r.skipped.push('autoreply:spam')
    else if (!autoReplyAllowed(data.email, now())) r.skipped.push('autoreply:rate-limited')
    else {
      const ackErr = await sendMail(env.RESEND_API_KEY!, buildAutoReply(data, from), fetchImpl)
      if (ackErr === null) r.autoReplied = true
      else {
        r.failures.push(`autoreply: ${ackErr}`)
        log.error(`[contact] AUTOREPLY-FAIL ${ackErr} — ${summary}`)
      }
    }
  } else {
    r.skipped.push('forward:no-mail-provider', 'autoreply:no-mail-provider')
  }

  r.delivered = r.persisted || r.notified || r.forwarded
  if (!r.delivered) {
    log.error(`[contact] LOST every configured channel failed (${r.failures.join('; ')}) — message from ${summary}:\n${data.message}`)
  }
  return r
}
