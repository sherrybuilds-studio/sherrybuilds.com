// Persistence half of the contact pipeline: one PostgREST insert into
// `contact_messages` (migrations/00*.sql) in the root Supabase project, using
// the project's secret key (bypasses RLS; the table has RLS on and no
// policies, so nothing else can touch it). Raw fetch on purpose — one
// request, no client library, fully mockable.
//
// The row id is chosen by the pipeline before any network call (it is also
// the journal id and the Telegram reference) and the insert is idempotent
// on it (`on_conflict=id` + ignore-duplicates), so the host-side sweep can
// replay a journaled entry without creating a second row.
// Never throws: the route keeps going (Telegram, mail) whatever this does.

export type ContactData = { name: string; email: string; message: string }
export type ContactMeta = { ip: string; userAgent: string }
export type StoreConfig = { url: string; key: string }
export type StoreResult = { ok: true } | { ok: false; error: string }

/** Storage form of a submission: already truncated and HTML-escaped. */
export type ContactRow = {
  id: string
  name: string
  email: string
  message: string
  ip: string
  user_agent: string
  synthetic: boolean
  truncated_from: number | null
}

const TIMEOUT_MS = 8_000

function headers(cfg: StoreConfig, prefer: string): Record<string, string> {
  return {
    apikey: cfg.key,
    Authorization: `Bearer ${cfg.key}`,
    'Content-Type': 'application/json',
    Prefer: prefer,
  }
}

async function call(
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch
): Promise<StoreResult> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetchImpl(url, { ...init, signal: ctrl.signal })
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  } finally {
    clearTimeout(timer)
  }
}

const base = (cfg: StoreConfig) => `${cfg.url.replace(/\/$/, '')}/rest/v1/contact_messages`

export async function persistContact(
  row: ContactRow,
  cfg: StoreConfig,
  fetchImpl: typeof fetch = fetch
): Promise<StoreResult> {
  return call(
    `${base(cfg)}?on_conflict=id`,
    {
      method: 'POST',
      headers: headers(cfg, 'resolution=ignore-duplicates,return=minimal'),
      body: JSON.stringify({ ...row, source: 'sherrybuilds.com' }),
    },
    fetchImpl
  )
}

/** Stamp notified_at after a successful Telegram send — what the daily
 *  outside-in probe reads to prove the Telegram hop. Non-fatal. */
export async function markNotified(
  id: string,
  at: string,
  cfg: StoreConfig,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  const r = await call(
    `${base(cfg)}?id=eq.${id}`,
    { method: 'PATCH', headers: headers(cfg, 'return=minimal'), body: JSON.stringify({ notified_at: at }) },
    fetchImpl
  )
  return r.ok
}
