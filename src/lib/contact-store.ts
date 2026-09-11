// Persistence half of the contact pipeline: one PostgREST insert into
// `contact_messages` (migrations/001_contact_messages.sql) in the root
// Supabase project, using the project's secret key (bypasses RLS; the table
// has RLS on and no policies, so nothing else can touch it). Raw fetch on
// purpose — one request, no client library, fully mockable.
// Never throws: the route keeps going (Telegram, mail) whatever this does.

export type ContactData = { name: string; email: string; message: string }
export type ContactMeta = { ip: string; userAgent: string }
export type StoreConfig = { url: string; key: string }
export type StoreResult = { ok: true; id: string | null } | { ok: false; error: string }

const TIMEOUT_MS = 8_000

export async function persistContact(
  data: ContactData,
  meta: ContactMeta,
  cfg: StoreConfig,
  fetchImpl: typeof fetch = fetch
): Promise<StoreResult> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetchImpl(`${cfg.url.replace(/\/$/, '')}/rest/v1/contact_messages`, {
      method: 'POST',
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        message: data.message,
        ip: meta.ip,
        user_agent: meta.userAgent,
        source: 'sherrybuilds.com',
      }),
      signal: ctrl.signal,
    })
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}` }
    }
    const rows = (await res.json().catch(() => [])) as { id?: string }[]
    return { ok: true, id: rows[0]?.id ?? null }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  } finally {
    clearTimeout(timer)
  }
}
