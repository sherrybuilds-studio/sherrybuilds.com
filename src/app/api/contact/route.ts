import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { handleContact } from "@/lib/contact-pipeline";

// Where a submission goes is decided by src/lib/contact-pipeline.ts:
//   journal  → write-ahead line on disk    CONTACT_JOURNAL_DIR (host bind mount)
//   persist  → Supabase contact_messages   SUPABASE_URL + SUPABASE_KEY
//   notify   → Telegram (the digests' bot) TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
//   forward  → email to Sherry via Resend  RESEND_API_KEY (+ CONTACT_EMAIL_TO/FROM)
//   ack      → auto-reply to the visitor   RESEND_API_KEY, spam- and rate-gated
// All four come from .env.local on the VPS (deploy/vps-pull-release.sh
// carries them into the container). The visitor gets `ok` only when at
// least one channel that reaches Sherry succeeded; with nothing configured
// the route answers 502 rather than a false "Message sent." — the mailto
// link sits next to the form. Failures are logged with grep-able markers
// (`[contact] NOTIFY-FAIL` etc.) to stderr → `docker logs sherrybuilds-portfolio`.

// Anti-abuse: each valid POST fans out to up to four upstreams. Without a
// cap a script could flood the inbox and exhaust the mail quota so real
// leads bounce. Honeypot + zod caps alone don't stop a loop.
const CONTACT_MAX_PER_HOUR = 5;

const contactSchema = z.object({
  name: z.string().min(2, "Please enter your name.").max(100),
  email: z.string().email("Please enter a valid email."),
  // Oversized text is capped and KEPT by the pipeline (MESSAGE_CAP) — a pasted
  // job description must never bounce as "Invalid input". Only absurd bodies
  // are refused here.
  message: z.string().min(10, "A couple of sentences helps.").max(50_000),
  // honeypot — real users never fill this
  company: z.string().max(0).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`contact:${ip}`, CONTACT_MAX_PER_HOUR, 60 * 60_000)) {
    return NextResponse.json(
      { ok: false, error: "Too many messages — try again later or email directly." },
      { status: 429 }
    );
  }
  let data: z.infer<typeof contactSchema>;
  try {
    data = contactSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid input." }, { status: 400 });
  }

  const result = await handleContact(
    { name: data.name, email: data.email, message: data.message },
    { ip, userAgent: (req.headers.get("user-agent") ?? "").slice(0, 300) },
    {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_KEY: process.env.SUPABASE_KEY,
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
      TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      CONTACT_EMAIL_TO: process.env.CONTACT_EMAIL_TO,
      CONTACT_EMAIL_FROM: process.env.CONTACT_EMAIL_FROM,
      CONTACT_JOURNAL_DIR: process.env.CONTACT_JOURNAL_DIR,
    }
  );

  if (!result.delivered) {
    return NextResponse.json(
      { ok: false, error: "Couldn't send right now — try email instead." },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
