// Auto-reply half of the contact pipeline: the acknowledgment mail a
// visitor gets after submitting. Only sent when a mail provider is
// configured (Resend), never to spam-looking input, and rate-limited so a
// loop cannot burn the mail quota or turn the site into a backscatter
// source: 1 per address per hour, 20 per day overall.

import type { ContactData } from './contact-store.ts'
import { headerSafe } from './contact-email.ts'
import { rateLimit } from './rate-limit.ts'

// Non-global on purpose: a /g regex makes .test() stateful across calls.
const URL_RE = /\bhttps?:\/\/|\bwww\./i
const URL_ALL_RE = /\bhttps?:\/\/|\bwww\./gi
const MARKUP_RE = /<a\s|href=|\[url[=\]]/i
const PITCH_RE = /\b(backlinks?|seo (services?|packages?|audit)|guest posts?|casino|viagra|crypto (signals?|investment)|loan offer)\b/i

export function looksLikeSpam(data: ContactData): boolean {
  if (URL_RE.test(data.name)) return true
  if (MARKUP_RE.test(data.message)) return true
  if (PITCH_RE.test(data.message)) return true
  const links = data.message.match(URL_ALL_RE)?.length ?? 0
  return links >= 3
}

// One public address for everything new (2026-09-11): the visitor's reply
// to the acknowledgment lands in the same inbox as the forwarded message.
export const REPLY_TO = 'sherry.aiops@gmail.com'

export function buildAutoReply(data: ContactData, from: string) {
  const name = headerSafe(data.name)
  return {
    from: `Shehryar Irfan <${from}>`,
    to: [data.email],
    reply_to: REPLY_TO,
    subject: 'Got your message — Shehryar',
    text: [
      `Hi ${name},`,
      '',
      "Thanks — I'll reply personally within a few hours.",
      '',
      'Meanwhile, two things you can look at right now:',
      '- the evidence section, with dated eval records for every system: https://sherrybuilds.com/#evidence',
      '- the demo section, where the live voice demo is on request: https://sherrybuilds.com/#demo',
      '',
      'Shehryar Irfan',
      'Berlin · sherrybuilds.com',
      '',
      '(Automatic acknowledgment — your message is in my inbox, no need to resend.)',
    ].join('\n'),
  }
}

const PER_ADDRESS_WINDOW_MS = 60 * 60_000
const DAILY_LIMIT = 20
const DAILY_WINDOW_MS = 24 * 60 * 60_000

/** One acknowledgment per address per hour, twenty per day site-wide. */
export function autoReplyAllowed(email: string, now = Date.now()): boolean {
  if (!rateLimit(`autoreply:addr:${email.trim().toLowerCase()}`, 1, PER_ADDRESS_WINDOW_MS, now)) return false
  return rateLimit('autoreply:day', DAILY_LIMIT, DAILY_WINDOW_MS, now)
}
