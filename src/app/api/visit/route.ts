import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// First-party page-view beacon (see src/components/portfolio-dark/VisitPing.tsx).
// Design rules, in order:
//   1. NEVER affect the site: every outcome — bad body, rate-limited, table
//      missing, Supabase down — answers 204 fast and moves on.
//   2. No cookies, no raw IP at rest: `visitor` is sha256(ip + UTC day), so
//      one visitor's views group within a day but can't be traced across days.
//   3. Bots are recorded but flagged (is_bot), so crawler traffic is
//      separable, not silently mixed into "who visited".
// Rows land in Supabase `page_visits` (migrations/003). Failures log with
// the grep-able marker [visit] PERSIST-FAIL.

const visitSchema = z.object({
  path: z.string().startsWith("/").max(200),
  referrer: z.string().max(500).optional(),
});

const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|preview|fetch|monitor|curl|python-requests/i;

const NO_CONTENT = () => new Response(null, { status: 204 });

async function visitorHash(ip: string): Promise<string> {
  const day = new Date().toISOString().slice(0, 10);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}|${day}`));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  // generous: a human can't produce 120 page loads/hour by reading a portfolio
  if (!rateLimit(`visit:${ip}`, 120, 60 * 60_000)) return NO_CONTENT();

  let data: z.infer<typeof visitSchema>;
  try {
    // sendBeacon posts text/plain — read raw and parse, don't trust content-type
    data = visitSchema.parse(JSON.parse(await req.text()));
  } catch {
    return NO_CONTENT();
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) return NO_CONTENT(); // unconfigured → silently off

  const ua = (req.headers.get("user-agent") ?? "").slice(0, 300);
  const row = {
    path: data.path,
    referrer: data.referrer?.slice(0, 500) ?? null,
    country: req.headers.get("cf-ipcountry") ?? null,
    user_agent: ua,
    visitor: await visitorHash(ip),
    is_bot: BOT_RE.test(ua),
  };

  try {
    const res = await fetch(`${url}/rest/v1/page_visits`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) console.error("[visit] PERSIST-FAIL", res.status, (await res.text()).slice(0, 200));
  } catch (e) {
    console.error("[visit] PERSIST-FAIL", e instanceof Error ? e.message : e);
  }
  return NO_CONTENT();
}
