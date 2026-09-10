"use client";

import Reveal from "@/components/portfolio/Reveal";

// Public demo line gated 2026-09-10 (audio-quality incident on the demo
// number, reproduced across caller networks). The number is deliberately
// absent from this bundle until the line is verified clean again; demos
// run on request through the contact section. Un-gating = restore the
// tel: button here (git history has it) — Sherry's call, with evidence.

const mono: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--step--1)",
  letterSpacing: "0.08em",
  color: "var(--muted)",
};

export default function DarkDemo() {
  return (
    <section
      id="demo"
      aria-labelledby="demo-heading"
      data-chapter=""
      className="relative overflow-hidden"
      style={{ paddingBlock: "clamp(5rem, 12vh, 8rem)" }}
    >
      <div data-chapter-inner="" className="mx-auto w-full max-w-[80rem] px-6 lg:px-10">
        <div
          className="glass-liquid mx-auto max-w-[56rem] rounded-3xl text-center"
          style={{ padding: "clamp(2.5rem, 6vw, 4rem)" }}
        >
          <div className="glass-liquid-content">
            <Reveal>
              <p className="uppercase" style={mono}>
                Live demo
              </p>
            </Reveal>
            <Reveal delay={0.06}>
              <h2
                id="demo-heading"
                className="mx-auto mt-[var(--space-6)] max-w-[20ch]"
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
                Don&apos;t take my word for it — hear it.
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p
                className="mx-auto mt-[var(--space-6)] max-w-[52ch]"
                style={{ fontSize: "var(--step-0)", lineHeight: 1.65, color: "var(--muted)" }}
              >
                The receptionist answers in German or English, books a table or an
                appointment, and handles interruptions without losing the thread. It
                tells you it&apos;s an AI in the first sentence (EU AI Act Art. 50) and
                asks before anything is recorded (§201 StGB). Both are written to a
                tamper-evident journal on every call.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <p
                className="mx-auto mt-[var(--space-8)] max-w-[44ch]"
                style={{ fontSize: "var(--step-0)", lineHeight: 1.6, color: "var(--text)" }}
              >
                Live voice demo on request — email me and Clara will be on the line
                within the hour.
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <a
                href="#contact"
                className="glass pf-btn mt-[var(--space-8)] inline-flex items-center gap-2 rounded-full px-8 font-medium"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(34, 211, 238, 0.22), rgba(34, 211, 238, 0.10))",
                  borderColor: "rgba(34, 211, 238, 0.40)",
                  color: "var(--text)",
                  height: "3.25rem",
                  fontSize: "1rem",
                }}
              >
                Request a live demo
              </a>
            </Reveal>
            <Reveal delay={0.3}>
              <p className="mt-[var(--space-4)] uppercase" style={{ ...mono, fontSize: "0.7rem" }}>
                Demo on request · you&apos;re talking to an AI
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
