"use client";

import Reveal from "@/components/portfolio/Reveal";

// The number is a setting in apps/sales-os (demo_phone_number) and listed in
// the vault's Verified-Metrics. US line for now; swap here when the German
// number exists.
const DEMO_NUMBER_DISPLAY = "+1 650 479 7535";
const DEMO_NUMBER_TEL = "+16504797535";

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
                Don&apos;t take my word for it — call it.
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
              <a
                href={`tel:${DEMO_NUMBER_TEL}`}
                className="glass pf-btn mt-[var(--space-10)] inline-flex items-center gap-2 rounded-full px-8 font-medium"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(34, 211, 238, 0.22), rgba(34, 211, 238, 0.10))",
                  borderColor: "rgba(34, 211, 238, 0.40)",
                  color: "var(--text)",
                  height: "3.25rem",
                  fontSize: "1rem",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                Call {DEMO_NUMBER_DISPLAY}
              </a>
            </Reveal>
            <Reveal delay={0.24}>
              <p className="mt-[var(--space-4)] uppercase" style={{ ...mono, fontSize: "0.7rem" }}>
                US demo line for now · a German number is next · you&apos;re talking to an AI
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
