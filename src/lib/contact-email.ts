// Builds the Resend payload for a contact-form submission. Kept out of the
// route file so the header-injection guard is unit-testable.

export type ContactData = { name: string; email: string; message: string }

/** Collapse CR/LF and strip other control characters so user input can't
 *  inject or split email header lines. */
export function headerSafe(value: string): string {
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim()
}

export function buildContactEmail(data: ContactData, from: string, to: string) {
  const name = headerSafe(data.name)
  return {
    from: `Portfolio <${from}>`,
    to: [to],
    reply_to: data.email,
    subject: `Portfolio contact — ${name}`,
    text: `From: ${name} <${data.email}>\n\n${data.message}`,
  }
}
