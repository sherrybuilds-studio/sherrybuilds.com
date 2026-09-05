# Outbound demo widget — "Clara calls you"

> **STATUS: DESIGN ONLY — NOT APPROVED, NOT BUILT.**
> Build starts only after Sherry approves this document in a future session.
> Do not implement any part of this from this doc without that approval.
> (Design written 2026-09-05; all prices are estimates to re-verify against
> live pricing pages on build day.)

The inbound demo ("call +1 650 479 7535") asks the visitor to spend their own
money and courage. This widget inverts it: the visitor types their number,
proves they own it, and Clara calls **them** within seconds. Higher
conversion, but it turns the portfolio into a machine that dials real phones
— so the abuse, cost, and legal controls below are the actual product.

---

## 1. Flow

```
visitor enters number (E.164 picker, country dropdown)
        │
        ▼
consent checkbox (unchecked by default, exact text below)
        │
        ▼
SMS OTP: 6-digit code to that number via Twilio Verify   ← proves possession
        │  (3 attempts, 10-min expiry, then locked for 1h)
        ▼
server gate: limits · calling hours · blocklist · kill switch · cost cap
        │
        ▼
POST https://api.vapi.ai/call        (Vapi outbound call API)
  { assistantId: <clara-demo>, phoneNumberId: <outbound-caller-id>,
    customer: { number: <verified E.164> },
    assistantOverrides: { firstMessage: <demo first message below>,
                          maxDurationSeconds: 300 } }
        │
        ▼
Clara calls within ~5–15 s · row logged to Supabase · auto-deleted after 7 days
```

**Consent checkbox text (verbatim):**

> ☐ Call me now at the number above. I understand this is a **demo call from
> an AI voice agent**, requested by me; it is not recorded, and my number,
> IP address and the time of this request are stored for 7 days to prevent
> abuse, then deleted. One demo call per number per day.

**Demo first message (Clara, verbatim draft):**

> "Hi — this is Clara, an **AI voice assistant** calling from Shehryar's
> portfolio, because **you requested this call on sherrybuilds.com a few
> seconds ago**. This is a short demo — I'm not a human, and this call isn't
> recorded. Want to try booking a table with me, in English or German?"

Art. 50 disclosure ("AI voice assistant") and the requested-by-you statement
are both in the first sentence, before anything else.

### Verification step — decision: SMS OTP (Twilio Verify), not email-link

The threat to design against is **harassment-by-proxy**: someone enters a
victim's number and our AI cold-calls them. An email-confirmation link
verifies the wrong thing — possession of *an inbox*, which says nothing
about who owns the phone number. SMS OTP proves possession of the exact
number we are about to dial, which is the entire point.

Provider: **Twilio Verify** rather than hand-rolled OTP over raw SMS —
Verify ships code generation, expiry, retry throttling and carrier
compliance out of the box (~$0.05/verification), and a Twilio account
pairs naturally with Vapi (Vapi can import Twilio numbers, which we will
want anyway for a German caller ID). Runner-up considered: "we call you and
you press 1" — costs a full call before verification and confuses the UX.

---

## 2. Abuse controls (all server-side, all fail closed)

| Control | Value | Mechanism |
|---|---|---|
| Per-number limit | **1 call / number / day** | Supabase unique check on (number, date) |
| Per-IP limit | **3 calls / IP / day** | same table, IP column |
| Global daily cap | **10 calls / day** | count of today's rows before dialing |
| OTP attempts | 3 per number per 10 min, then 1 h lock | Twilio Verify config + our row |
| Calling hours | **09:00–20:00 callee-local, Mon–Sat** | derived from country code; requests outside → "we'll be asleep, try tomorrow" |
| Country allowlist | launch with **+49 and +1 only** | reject others at validation; expand deliberately |
| Blocklist | numbers + IPs, editable without deploy | Supabase table checked pre-OTP |
| Kill switch | `OUTBOUND_DEMO_ENABLED` env flag | **unset = OFF** (fail closed); flip via `.env.local` + `--force` container recreate, no release needed |
| Per-call cost cap | `maxDurationSeconds: 300` on the Vapi call | hard stop at 5 min |
| Per-day cost cap | **€5/day**: sum today's `cost` from Vapi `GET /call` before each dial; at/over budget → refuse | belt over the count cap; catches a pricing surprise |

Every refusal returns a friendly, specific message — never a silent failure
— and every gate is checked server-side *after* OTP, immediately before the
Vapi call (the OTP screen must not be a receipt for a guaranteed call).

---

## 3. Legal notes

- **UWG §7 (cold-calling)** — §7(2) Nr. 1 UWG makes telephone advertising to
  consumers unlawful without *prior express consent* ("vorherige
  ausdrückliche Einwilligung"). Position: this is not a cold call — the call
  is placed **only** on the visitor's own explicit, informed, documented
  request, made seconds earlier: an affirmative unchecked-by-default
  checkbox naming exactly what will happen, plus OTP proof that the
  requester possesses the number being called. That is a solicited callback
  with express prior consent — the inverse of unsolicited advertising. We
  keep the proof (consent text version, timestamp, IP, OTP result) with the
  request row. Note the tension: UWG burden-of-proof favours keeping consent
  records *longer* than 7 days → open question #4.
- **EU AI Act Art. 50** — AI disclosure in the first sentence of the first
  message (see verbatim draft above), same standard as inbound Clara.
- **§201 StGB (recording)** — the demo call is **not recorded**, so no
  recording-consent step is needed. If recording is ever enabled for demos,
  it inherits inbound Clara's ask-consent-first flow unchanged.
- **GDPR** — lawful basis Art. 6(1)(b) (service explicitly requested) with
  documented consent on top. Stored: E.164 number, request timestamp, IP,
  consent-text version, OTP outcome, Vapi call id, country code. Retention:
  **7 days**, then hard-deleted by a daily cron. Location: the
  **voice-receptionist Supabase project** (the one already holding
  `voice_calls`), new table `outbound_demo_requests` — confirm the project
  ref and that it is on an EU region before build (open question #5).
  Privacy-page paragraph gets a section for this widget.

---

## 4. Cost model (estimates — re-verify on build day)

Assumptions: avg demo 2.5 min · Vapi platform $0.05/min · STT+TTS+LLM
≈ $0.08–0.13/min pass-through · outbound telephony via Twilio ≈ $0.014/min
(US) but **≈ $0.12–0.19/min to German mobiles** (DE mobile termination is
the expensive path and the likely majority) · Twilio Verify ≈ $0.05/OTP ·
Twilio number rental ≈ $1.15/mo.

| Volume | Calls | OTP | Telephony (DE-mob heavy) | Vapi stack | **≈ Total/mo** |
|---|---|---|---|---|---|
| Low | 10 | $0.50 | $3–5 | $3.50 | **$8–10** |
| Mid | 50 | $2.50 | $15–24 | $17 | **$35–45** |
| High | 200 | $10 | $60–95 | $70 | **$140–175** |

The €5/day cost cap (~$160/mo ceiling) means the high tier is only reachable
if deliberately allowed. At expected portfolio traffic, this runs at the low
tier — pocket money for a live "it calls YOU" demo no other candidate has.

---

## 5. Implementation estimate

| Piece | Estimate | Notes |
|---|---|---|
| API routes (`/api/demo-call/request`, `/verify`) | 2–3 h | zod, rate-limit lib reuse, fail-closed gates |
| Vapi outbound integration | 1–2 h | POST /call, firstMessage override, cost readback |
| OTP step (Twilio Verify) | 2 h | + account/number setup outside code |
| Limits, kill switch, cost gate | 2–3 h | the part that must be right |
| Supabase table + 7-day deletion cron | 1 h | |
| Frontend widget (number input, consent, OTP UI) | 2 h | |
| Tests (unit + e2e with mocked Vapi/Twilio) | 2–3 h | mock everything that dials or spends |
| **Total** | **~12–16 h** | across 2–3 sessions |

**Riskiest part (flagged):** the money-and-dialing gate. A logic slip here
either drains the budget (retry loop against Vapi) or calls someone who
didn't consent (a legal problem, not a bug). Specific dangers: Vapi's
`cost` field is eventually-consistent (a same-minute burst can slip under
the €5 gate → mitigate with the count caps, which are transactional on our
side), and calling-hours math across time zones (compute from the callee's
country code, never the server clock). Second risk: this is the first
feature where a *portfolio* bug has a blast radius outside the browser —
it gets the strictest test gate in the repo and ships behind the kill
switch, default OFF.

---

## 6. Open questions for Sherry

1. **Twilio account** — none exists today (the +1 650 demo line is
   Vapi-provisioned). OK to create one for Verify + a German outbound
   caller ID, or prefer OTP via a different SMS provider?
2. **German caller ID** — outbound demos to +49 from a +1 number will look
   like spam and tank pickup rates. Buy a +49 number first (Twilio, ~€1–5/mo
   + regulatory bundle paperwork), or launch +1-only and add +49 later?
3. **Global cap & budget** — happy with 10 calls/€5 per day, or set lower
   for launch (e.g. 5/€3)?
4. **Consent-record retention** — keep the pure 7-day deletion (GDPR
   minimization), or retain consent proof 6–12 months (UWG burden of proof)
   with the *number pseudonymised* after 7 days? Recommend the latter;
   needs your call.
5. **Supabase project** — confirm the voice-receptionist project ref for
   `outbound_demo_requests`, and that it's hosted in an EU region.
6. **Placement** — replace the inbound "Call the demo" card in the Live
   demo section, or sit beside it as a second option?
7. **Language of the widget UI** — EN only, or EN/DE toggle to match
   Clara's bilingual pitch?
