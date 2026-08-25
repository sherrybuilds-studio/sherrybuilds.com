"use client";

import { useRef } from "react";
import Reveal from "@/components/portfolio/Reveal";
import { gsap, ScrollTrigger, useGSAP, EASE } from "@/lib/gsap";
import DemoVideo from "./DemoVideo";

type CaseStudy = {
  index: string;
  title: string;
  meta: string;
  description: string;
  metric: string;
  metricAccent: boolean;
  stack: string[];
  demo: string; // basename under public/demos/
  link?: { label: string; href: string };
};

// Every number here is listed in the vault's 03-System/Verified-Metrics.md
// with its evidence (2026-08-25). Change the evidence first, then the copy.
const CASES: CaseStudy[] = [
  {
    index: "01",
    title: "AI Phone Receptionist",
    meta: "Live · Berlin · German & English",
    description:
      "Owner-run salons and restaurants lose bookings to unanswered phones. This receptionist picks up every call, speaks German or English, books the appointment through a tool webhook — and says it's an AI in its first sentence (EU AI Act Art. 50), asks before recording (§201 StGB), and writes tamper-evident evidence for every call.",
    metric: "43 real calls · 12/12 outcome eval (2026-08-25) · compliance evidence per call",
    metricAccent: true,
    stack: ["Vapi", "FastAPI", "Python", "Supabase"],
    demo: "voice-call-demo",
    link: { label: "Call the demo", href: "#demo" },
  },
  {
    index: "02",
    title: "Self-Healing Agent Fleet",
    meta: "Self-built · Operations",
    description:
      "17 agents run the server from a Postgres-leased queue: code review, security sweeps, backup checks, evals, log digests. Before the self-healer, 43% of runs were failing or stale. A classify → policy → remediate loop with a daily kill-switch drained a 471-run backlog to zero in one day; a cost-truth ledger enforces a €10/day cap.",
    metric: "520 runs since Jul 9 · 0.8% hard failures · backlog 471 → 0",
    metricAccent: true,
    stack: ["Python", "PostgreSQL", "PM2", "Claude Code"],
    demo: "telegram-digest-walkthrough",
  },
  {
    index: "03",
    title: "Multilingual RAG Commerce Agent",
    meta: "Client pilot · Commerce",
    description:
      "A WhatsApp sales agent on FastAPI with an HMAC-verified webhook, answering over a product catalog through hybrid RAG — a keyword pass catches SKUs that embeddings dilute. A semantic cache (95% cosine, 7-day TTL + LRU) cuts repeat cost, and every response is cost-traced in Langfuse.",
    metric: "38% token cost cut (1,118 → 695 / message) · Langfuse-traced",
    metricAccent: true,
    stack: ["Python", "FastAPI", "ChromaDB", "Claude", "Langfuse"],
    demo: "rag-commerce-agent",
  },
  {
    index: "04",
    title: "Autonomous Job Pipeline",
    meta: "Self-built · Automation · parked",
    description:
      "A five-stage pipeline that ran itself every morning: scrape Adzuna, Arbeitnow and Firecrawl, score by weighted fit, draft cover letters with Claude, dedupe in Supabase, send a Telegram digest — with graceful degradation when a source was down.",
    metric: "Ran daily on cron · last run 2026-08-20 · parked Aug 23 to focus on voice",
    metricAccent: false,
    stack: ["Python", "Claude", "Supabase", "Firecrawl", "cron"],
    demo: "agent-pipeline",
    link: { label: "GitHub", href: "https://github.com/sherrybuilds-studio/job-hunt-ai" },
  },
];

const mono: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--step--1)",
  letterSpacing: "0.08em",
  color: "var(--muted)",
};

export default function DarkWork() {
  const scope = useRef<HTMLElement>(null);

  // Card entrances: alternate slide direction (odd from left, even from
  // right), gentle 40px + fade, then heading -> meta -> body -> metrics
  // stagger inside. Plays once per card. Reduced motion: no transforms,
  // everything simply visible.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>(".work-card").forEach((card, i) => {
          const items = card.querySelectorAll(".work-stagger");
          gsap.set(card, { autoAlpha: 0, x: i % 2 === 0 ? -40 : 40 });
          gsap.set(items, { autoAlpha: 0, y: 14 });
          // PERF: build the timeline PAUSED at mount (idle) — not inside
          // onEnter — so the object construction doesn't land on the scroll
          // critical path. onEnter just plays it.
          const tl = gsap
            .timeline({ paused: true })
            .to(card, { autoAlpha: 1, x: 0, duration: 0.6, ease: EASE })
            .to(
              items,
              { autoAlpha: 1, y: 0, duration: 0.45, ease: EASE, stagger: 0.1 },
              "-=0.35"
            );
          ScrollTrigger.create({
            trigger: card,
            start: "clamp(top 80%)",
            once: true,
            onEnter: () => tl.play(),
          });
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set([".work-card", ".work-stagger"], { autoAlpha: 1, x: 0, y: 0 });
      });
    },
    { scope }
  );

  return (
    <section
      id="work"
      ref={scope}
      aria-labelledby="work-heading"
      data-chapter=""
      className="relative overflow-hidden"
      style={{ paddingBlock: "clamp(6rem, 14vh, 10rem)" }}
    >
      <div data-chapter-inner="" className="mx-auto w-full max-w-[80rem] px-6 lg:px-10">
        <Reveal className="text-center">
          <p className="uppercase" style={mono}>
            02 — Selected Work
          </p>
        </Reveal>
        <h2 id="work-heading" className="sr-only">
          Selected Work
        </h2>

        <div className="mt-[var(--space-16)] flex flex-col gap-[var(--space-16)] lg:gap-[var(--space-24)]">
          {CASES.map((c, i) => {
            const flipped = i % 2 === 1;
            return (
              <article
                key={c.index}
                className="work-card glass glass-glow rounded-3xl"
                data-reveal=""
              >
                <div
                  className="grid grid-cols-1 items-center gap-[var(--space-12)] lg:grid-cols-12 lg:gap-[var(--space-12)]"
                  style={{ padding: "clamp(2rem, 6vw, 3rem)" }}
                >
                  {/* text */}
                  <div className={`lg:col-span-6 ${flipped ? "lg:order-2" : ""}`}>
                    <span style={mono}>{c.index}</span>
                    <h3
                      className="work-stagger mt-[var(--space-3)]"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "var(--step-4)",
                        fontWeight: 480,
                        lineHeight: 1.12,
                        letterSpacing: "-0.015em",
                        color: "var(--text)",
                        textWrap: "balance",
                      }}
                    >
                      {c.title}
                    </h3>
                    <p className="work-stagger mt-[var(--space-2)] uppercase" style={mono}>
                      {c.meta}
                    </p>
                    <p
                      className="work-stagger mt-[var(--space-6)]"
                      style={{
                        fontSize: "var(--step-0)",
                        lineHeight: 1.65,
                        color: "var(--muted)",
                        maxWidth: "48ch",
                      }}
                    >
                      {c.description}
                    </p>
                    <div className="work-stagger mt-[var(--space-6)] flex flex-wrap items-baseline gap-x-[var(--space-8)] gap-y-[var(--space-3)]">
                      <span
                        style={{
                          ...mono,
                          color: c.metricAccent ? "var(--accent-ink)" : "var(--text)",
                        }}
                      >
                        {c.metric}
                      </span>
                      <span style={mono}>{c.stack.join(" · ")}</span>
                      {c.link && (
                        <a
                          href={c.link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pf-underline"
                          style={{ ...mono, color: "var(--accent-ink)" }}
                        >
                          {c.link.label} <span aria-hidden="true">→</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* demo video slot */}
                  <div className={`lg:col-span-6 ${flipped ? "lg:order-1" : ""}`}>
                    <DemoVideo name={c.demo} index={c.index} title={c.title} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
