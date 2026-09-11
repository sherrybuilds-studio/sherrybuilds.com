// Input edge cases for the contact pipeline.
//  - truncateMessage: an oversized message is capped and KEPT (with a marker
//    and the original length), never rejected — a recruiter pasting a job
//    description must not get "Invalid input".
//  - escapeHtml: the stored form (Supabase) is HTML-escaped with exactly the
//    mapping of Python's html.escape(s, quote=True), so the host-side sweep
//    writes identical rows when it replays the raw journal text. Telegram
//    gets the raw text (plain, no parse_mode), so it renders literally.
//  - isSynthetic: the daily outside-in probe submits through the public
//    site; its rows are flagged so lead views and brief counts exclude them.

import type { ContactData } from './contact-store.ts'

export const MESSAGE_CAP = 8000
export const PROBE_EMAIL = 'probe@sherrybuilds.com'
export const PROBE_TAG = '[synthetic-probe]'

export function truncateMessage(message: string): { message: string; truncatedFrom: number | null } {
  if (message.length <= MESSAGE_CAP) return { message, truncatedFrom: null }
  const marker = `\n\n[…truncated from ${message.length} chars]`
  return { message: message.slice(0, MESSAGE_CAP - marker.length) + marker, truncatedFrom: message.length }
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c])
}

export function isSynthetic(data: ContactData): boolean {
  return data.email.trim().toLowerCase() === PROBE_EMAIL && data.message.includes(PROBE_TAG)
}
