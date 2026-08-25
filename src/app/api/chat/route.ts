import { NextResponse } from "next/server";
import { z } from "zod";

// Server-side proxy to apps/portfolio-chat (FastAPI). The browser never
// talks to the backend directly. Inside the container, host loopback is not
// reachable, so the default targets the docker bridge gateway.
const BACKEND = process.env.CHAT_BACKEND_URL ?? "http://172.17.0.1:7040";

const askSchema = z.object({ question: z.string().min(1).max(500) });

export async function POST(req: Request) {
  let data: z.infer<typeof askSchema>;
  try {
    data = askSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Ask a question of up to 500 characters." }, { status: 400 });
  }

  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45_000); // GLM reasoning can take a while
  try {
    const res = await fetch(`${BACKEND}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
      body: JSON.stringify({ question: data.question }),
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (res.status === 429) {
      return NextResponse.json(
        { ok: false, error: "Too many questions at once — give it a minute." },
        { status: 429 }
      );
    }
    if (!res.ok) throw new Error(`backend ${res.status}`);
    const body = await res.json();
    return NextResponse.json({ ok: true, ...body });
  } catch (err) {
    console.error("[chat] backend unavailable:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { ok: false, error: "The assistant is offline right now — the projects section has the same facts." },
      { status: 503 }
    );
  } finally {
    clearTimeout(timer);
  }
}
