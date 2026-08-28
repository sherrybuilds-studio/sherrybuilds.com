/** Only accept a same-origin absolute path for post-login redirects.
 *  "//evil.com", "https://evil.com", "/\\evil.com" and javascript: URLs all
 *  fall back to "/". */
export function safeReturnPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback
  if (!raw.startsWith('/')) return fallback
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  if (/[\r\n]/.test(raw)) return fallback
  return raw
}
