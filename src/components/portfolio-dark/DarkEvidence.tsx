"use client";

import Reveal from "@/components/portfolio/Reveal";
import DemoVideo from "./DemoVideo";
import evidence from "@/data/evidence.json";

// Rendered from src/data/evidence.json — generated at build time by
// scripts/build-evidence.mjs from the monorepo's dated eval records, the
// fleet DB snapshot and the latest live pipeline run. No runtime calls.

const APP_LABEL: Record<string, string> = {
  "voice-receptionist": "Voice receptionist",
  "restaurant-bot": "Restaurant bot",
  "sales-os": "Sales OS",
  "job-hunter": "Job pipeline",
};

const mono: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--step--1)",
  letterSpacing: "0.08em",
  color: "var(--muted)",
};

const small: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "0.7rem",
  letterSpacing: "0.05em",
  color: "rgba(138, 150, 180, 0.72)",
  lineHeight: 1.6,
};

function Card({
  big,
  caption,
  date,
  status,
  detail,
  accent = false,
}: {
  big: string;
  caption: string;
  date: string;
  status?: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div className="glass glass-glow rounded-2xl" style={{ padding: "clamp(1.5rem, 3vw, 2rem)" }}>
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--step-5)",
          fontWeight: 460,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: accent ? "var(--accent)" : "var(--text)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {big}
      </p>
      <p className="mt-[var(--space-3)] uppercase" style={{ ...mono, lineHeight: 1.7 }}>
        {caption}
      </p>
      <p className="mt-[var(--space-2)]" style={small}>
        {date}
        {status ? ` · ${status}` : ""}
      </p>
      <p className="mt-[var(--space-1)]" style={small}>
        › {detail}
      </p>
    </div>
  );
}

export default function DarkEvidence() {
  const { evals, fleet, liveRun, generated } = evidence;
  const pct = fleet ? fleet.hard_failure_pct.toFixed(1) : "—";
  const backlogPct = fleet
    ? Math.round((100 * fleet.pre_healer_failed_or_stale) / fleet.pre_healer_total)
    : 0;

  return (
    <section
      id="evidence"
      aria-labelledby="evidence-heading"
      data-chapter=""
      className="relative overflow-hidden"
      style={{ paddingBlock: "clamp(5rem, 12vh, 8rem)" }}
    >
      <div data-chapter-inner="" className="mx-auto w-full max-w-[80rem] px-6 lg:px-10">
        <Reveal className="text-center">
          <p className="uppercase" style={mono}>
            Evidence · generated {generated}
          </p>
        </Reveal>
        <Reveal className="text-center" delay={0.06}>
          <h2
            id="evidence-heading"
            className="mx-auto mt-[var(--space-6)] max-w-[24ch]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--step-5)",
              fontWeight: 480,
              lineHeight: 1.1,
              letterSpacing: "-0.015em",
              color: "var(--text)",
              textWrap: "balance",
            }}
          >
            Eval gates, run counts, and one live pipeline run — dated.
          </h2>
        </Reveal>

        <div className="mt-[var(--space-12)] grid grid-cols-1 gap-[var(--space-6)] md:grid-cols-2 lg:grid-cols-3">
          {evals.map((e, i) => (
            <Reveal key={e.app} delay={i * 0.06}>
              <Card
                big={`${e.passed}/${e.total}`}
                caption={`${APP_LABEL[e.app] ?? e.app} — ${e.gate}`}
                date={e.date}
                status={e.status}
                detail={e.method}
                accent={e.app === "voice-receptionist"}
              />
            </Reveal>
          ))}
          {fleet && (
            <Reveal delay={0.2}>
              <Card
                big={`${pct}%`}
                caption={`hard-failure rate across ${fleet.runs} agent runs`}
                date={`since ${fleet.since} · snapshot ${fleet.date}`}
                status={`${fleet.enabled_agents} agents enabled`}
                detail={`${fleet.done} done · ${fleet.skipped} skipped · ${fleet.failed} failed — ${backlogPct}% failed-or-stale backlog (${fleet.pre_healer_failed_or_stale} of ${fleet.pre_healer_total}) drained to zero by the self-healer`}
              />
            </Reveal>
          )}
          {liveRun && (
            <Reveal delay={0.26}>
              <Card
                big={`${liveRun.prospects}/${liveRun.leads}`}
                caption={`prospects from a live Sales OS run — ${liveRun.query}`}
                date={liveRun.date}
                status={`~$${liveRun.costUsd.toFixed(2)} Places cost`}
                detail={`${liveRun.places} businesses scored on missed-call exposure · ${liveRun.coldDrafts} cold messages drafted (UWG §7 — consent first)`}
              />
            </Reveal>
          )}
        </div>

        {/* Recordings — two swap points, see DemoVideo.tsx for the file names */}
        <Reveal className="mt-[var(--space-16)] text-center">
          <p className="uppercase" style={mono}>
            Recordings
          </p>
        </Reveal>
        <div className="mt-[var(--space-8)] grid grid-cols-1 gap-[var(--space-8)] lg:grid-cols-2">
          <Reveal>
            <DemoVideo
              name="voice-call-demo"
              index="R1"
              title="Voice call demo"
              placeholder="R1 · voice call demo — recording coming"
            />
            <p className="mt-[var(--space-3)]" style={small}>
              A real call to the receptionist: greeting, AI disclosure, booking, interruption.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <DemoVideo
              name="telegram-digest-walkthrough"
              index="R2"
              title="Telegram digest walkthrough"
              placeholder="R2 · Telegram digest walkthrough — recording coming"
            />
            <p className="mt-[var(--space-3)]" style={small}>
              What the fleet sends every morning: run digest, cost ledger, escalations.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
