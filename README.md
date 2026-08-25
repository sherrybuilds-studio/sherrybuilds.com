# sherrybuilds.com

Source of [sherrybuilds.com](https://sherrybuilds.com) — the portfolio of Muhammad
Shehryar, AI automation engineer in Berlin. Next.js 16 · TypeScript · Tailwind ·
GSAP · React Three Fiber.

## What's on the page

| Section | Component | What it shows |
|---|---|---|
| Hero | `portfolio-dark/DarkHero` | voice-first positioning, "Call the live demo" |
| Proof | `DarkProof` | three verified numbers (43 real calls · 0.8% hard failures across 520 runs · 38% token cut) |
| Live demo | `DarkDemo` | the AI phone receptionist's number + the Art. 50 / §201 disclosure line |
| Work | `DarkWork` | AI phone receptionist → self-healing agent fleet → RAG commerce agent → job pipeline |
| Evidence | `DarkEvidence` | dated eval cards, fleet stats, one live pipeline run — **rendered from `src/data/evidence.json` at build time, no runtime calls** |
| Chat | `DarkChat` | "Ask about my work" — grounded in the public showcase, cites sources, refuses everything else |
| Dashboard | `/os` (password-gated) | ops cockpit: PM2, Docker, eval scores |

Every number on the site must exist in the owner's verified-metrics list with
dated evidence; there are no hand-typed scores in components.

## Evidence pipeline

```bash
node scripts/build-evidence.mjs     # reads the platform's docs/evals/*.json → src/data/evidence.json
```

## Chat backend

`/api/chat` (`src/app/api/chat/route.ts`) proxies server-side to a small FastAPI
service (`CHAT_BACKEND_URL`) that answers only from the public
[ai-systems-portfolio](https://github.com/sherrybuilds-studio/ai-systems-portfolio)
markdown, with citations, refusals, injection guards, rate limiting and a semantic cache.

## Develop / build

```bash
npm install
npm run dev          # http://127.0.0.1:3000
npm run lint
docker build -t sherrybuilds-portfolio .   # multi-stage, `next start`
```

Runtime env: `DASHBOARD_PASSWORD` (gates `/os`, `/demo`, `/api/*` except the
public routes listed in `src/proxy.ts`), optional `CHAT_BACKEND_URL`,
`RESEND_API_KEY` for the contact form. No secrets are committed.

## Demo footage

Drop recordings at `public/demos/<name>.mp4` (+ optional `.jpg` poster). Names in
use: `voice-call-demo`, `telegram-digest-walkthrough`, `rag-commerce-agent`,
`agent-pipeline`. They lazy-load, autoplay muted in view, and fall back to a
placeholder under reduced motion.

## License

MIT
