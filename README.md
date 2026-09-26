# sherrybuilds.com

Source of [sherrybuilds.com](https://sherrybuilds.com), the portfolio of Shehryar Irfan (Berlin).
Built with Next.js 16, TypeScript and Tailwind. The evidence section is generated at build time from dated eval JSON files, so no number on the page is typed by hand.
GitHub Actions builds each release, a human approves it, and the server pulls it. Nothing on GitHub can connect to the server.

---

## Architecture

```
 push to main
   └─▶ GitHub Actions: typecheck → lint → node tests → next build
         └─▶ image ghcr.io/sherrybuilds-studio/sherrybuilds-portfolio:<sha>
               └─▶ approval on the `production` environment → tag :release
                                                     │
 VPS cron, every 2 min: deploy/vps-pull-release.sh ◀─┘ (pull only)
   pull :release → run staging container on :3100 → poll /up
   → swap into :3000 → poll /up → keep previous container for rollback
                                                     │
 visitor ─▶ Cloudflare tunnel ─▶ 127.0.0.1:3000 (Next.js, `next start`)
```

| Part | Where | What it does |
|---|---|---|
| Page sections | `src/components/portfolio-dark/` | Hero, Proof, Demo, Work, Evidence, How I build, Stack, About, Contact |
| Evidence data | `scripts/build-evidence.mjs` → `src/data/evidence.json` | Reads the monorepo's `docs/evals/*.json` and the fleet snapshot at build time. The page makes no runtime calls for these numbers |
| Contact form | `src/app/api/contact/route.ts`, `src/lib/contact-*.ts` | Validate and sanitize, rate-limit, write to a journal on disk first, then store in Supabase, send email through Resend, and alert on Telegram. A sweep on the host replays journal lines that failed to deliver |
| Page views | `src/app/api/visit/route.ts` | First-party beacon into a Supabase `page_visits` table (`migrations/003_page_visits.sql`) |
| Auth gate | `src/proxy.ts` | `/os`, `/demo` and `/api/*` need a password cookie, except the public routes listed in the file. If `DASHBOARD_PASSWORD` is missing, the gate stays locked |
| Health check | `src/app/up/route.ts` | Deploy script polls `/up` before and after the swap |

## What's verified

| Check | Evidence |
|---|---|
| Numbers on the page match the eval files | `src/data/evidence.json` (generated 2026-09-24): voice 12/12, restaurant 10/10 and Sales OS 10/10 (evals dated 2026-09-02), fleet 1,000 runs at 2.4% hard failures (snapshot 2026-09-24) |
| Contact pipeline, rate limiting, path safety | `tests/unit/*.test.ts` |
| Login, security headers, snapshot gate, contact end to end | `tests/e2e/*.test.ts` |
| CI on every push | `.github/workflows/ci.yml` (typecheck, lint, test, build, then an approval-gated release) |

## Run locally

```bash
npm ci
npm run dev                 # http://127.0.0.1:3000
npm run lint
npm test                    # node --test over tests/**/*.test.ts
npm run build
node scripts/build-evidence.mjs   # needs SHERRYOS_ROOT pointing at a monorepo checkout with docs/evals
```

Database: paste `migrations/001_contact_messages.sql` to `003_page_visits.sql` into the Supabase SQL editor, in order.

Environment variables (names only; no values are committed):

| Variable | Used for |
|---|---|
| `DASHBOARD_PASSWORD` | Password gate for `/os`, `/demo`, private `/api/*` |
| `SUPABASE_URL`, `SUPABASE_KEY` | Contact messages, page visits |
| `RESEND_API_KEY`, `CONTACT_EMAIL_FROM`, `CONTACT_EMAIL_TO` | Contact email and auto-reply |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Contact alerts |
| `CONTACT_JOURNAL_DIR` | Write-ahead journal for contact messages |
| `CHAT_BACKEND_URL` | Optional. Backend for `/api/chat` (the chat widget is currently off) |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ENVIRONMENT` | Optional. Error reporting |
| `SHERRYOS_ROOT` | Build-time only: where `build-evidence.mjs` reads eval files |

## Limits

- The "Ask about my work" chat widget was taken off the page on 2026-09-07. `DarkChat.tsx` is kept but not mounted, and `/api/chat` sits behind the password gate.
- The public voice demo number is off the page since 2026-09-10, after an audio-quality problem on that line. Demos run on request through the contact form.
- The evidence build reads files from a private monorepo, so a fresh clone builds with whatever `src/data/evidence.json` is committed.

## License

MIT · Shehryar Irfan · [sherry.aiops@gmail.com](mailto:sherry.aiops@gmail.com)
