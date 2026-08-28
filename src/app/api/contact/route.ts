import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const contactSchema = z.object({
  name: z.string().min(2, "Please enter your name.").max(100),
  email: z.string().email("Please enter a valid email."),
  message: z.string().min(10, "A couple of sentences helps.").max(4000),
  // honeypot — real users never fill this
  company: z.string().max(0).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  // Anti-abuse: 5 submissions per hour per client IP (Resend quota + inbox spam).
  if (!rateLimit(`contact:${clientIp(req)}`, 5, 60 * 60_000)) {
    return NextResponse.json({ ok: false, error: "Too many messages — try again later." }, { status: 429 });
  }
  let data: z.infer<typeof contactSchema>;
  try {
    data = contactSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid input." }, { status: 400 });
  }

  // ── EMAIL DELIVERY SWAP POINT ─────────────────────────────────────────
  // Set RESEND_API_KEY (+ optionally CONTACT_EMAIL_TO / CONTACT_EMAIL_FROM,
  // FROM must be a Resend-verified domain) in .env.local and delivery goes
  // live — no code changes. Without a key the form still succeeds and the
  // message is logged to the server console so nothing is silently lost.
  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_EMAIL_TO ?? "codewithsherry1@gmail.com"; // VERIFY
  const from = process.env.CONTACT_EMAIL_FROM ?? "portfolio@sherrybuilds.com"; // VERIFY (Resend-verified domain)

  if (!key) {
    console.log("[contact] (stub — no RESEND_API_KEY) message:", {
      name: data.name,
      email: data.email,
      message: data.message,
    });
    return NextResponse.json({ ok: true });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Portfolio <${from}>`,
        to: [to],
        reply_to: data.email,
        subject: `Portfolio contact — ${data.name.replace(/[\r\n]+/g, " ")}`,
        text: `From: ${data.name} <${data.email}>\n\n${data.message}`,
      }),
    });
    if (!res.ok) {
      console.error("[contact] Resend error:", res.status, await res.text());
      return NextResponse.json(
        { ok: false, error: "Couldn't send right now — try email instead." },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[contact] delivery failed:", e);
    return NextResponse.json(
      { ok: false, error: "Couldn't send right now — try email instead." },
      { status: 502 }
    );
  }
}
