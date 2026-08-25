"use client";

import { useRef } from "react";
import { gsap, EASE, SplitText, useGSAP } from "@/lib/gsap";
import Reveal from "@/components/portfolio/Reveal";

type Metric = {
  value: string; // final display value, also the SSR/reduced-motion state
  suffix?: string;
  caption: string;
  context: string; // the "so what" — second, quieter line
  accent?: boolean;
};

const METRICS: Metric[] = [
  // Verified in the vault (03-System/Verified-Metrics.md, 2026-08-25).
  {
    value: "43",
    caption: "Real calls answered by the voice receptionist",
    context: "live in Berlin · AI disclosure + consent evidence logged per call",
    accent: true, // the lead — the system that is live today
  },
  {
    value: "0.8",
    suffix: "%",
    caption: "Hard-failure rate across 520 agent runs",
    context: "self-healing fleet — a 43% failed-or-stale backlog drained to zero",
  },
  {
    value: "38",
    suffix: "%",
    caption: "Token cost cut, Langfuse-measured",
    context: "1,118 → 695 tokens per message · semantic cache, 95% cosine",
  },
];

const mono: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--step--1)",
  letterSpacing: "0.08em",
  color: "var(--muted)",
};

export default function DarkProof() {
  const numberRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  // The statement BUILDS as you reach it: split into masked lines that
  // rise with scroll (soft scrub), staggered top to bottom. Reduced
  // motion never splits — the h2 just renders.
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const el = headlineRef.current;
      if (!el) return;
      const split = SplitText.create(el, {
        type: "lines",
        mask: "lines",
        autoSplit: true,
        onSplit(self) {
          // same descender-room trick as the hero masks
          (self.masks as HTMLElement[]).forEach((m) => {
            m.style.paddingBottom = "0.18em";
            m.style.marginBottom = "-0.18em";
          });
          return gsap.fromTo(
            self.lines,
            { yPercent: 115 },
            {
              yPercent: 0,
              ease: "none",
              stagger: 0.25,
              scrollTrigger: {
                trigger: el,
                start: "clamp(top 92%)",
                end: "clamp(top 45%)",
                scrub: 0.6,
              },
            }
          );
        },
      });
      return () => split.revert();
    });
  });

  // Count-up synced to THE Reveal via its onRevealStart hook — no second
  // scroll trigger. Markup ships the final value, so reduced-motion and
  // no-JS render it instantly; the count only ever runs once per load.
  const startCount = (i: number) => {
    const el = numberRefs.current[i];
    if (!el) return;
    const target = parseFloat(METRICS[i].value);
    const decimals = METRICS[i].value.includes(".") ? 1 : 0;
    const state = { v: 0 };
    gsap.to(state, {
      v: target,
      duration: 1.4,
      ease: EASE,
      onUpdate: () => {
        el.textContent = state.v.toFixed(decimals);
      },
    });
  };

  return (
    <section
      id="proof"
      aria-labelledby="proof-heading"
      data-chapter=""
      className="relative overflow-hidden"
      style={{ paddingBlock: "clamp(6rem, 14vh, 10rem)" }}
    >
      <div data-chapter-inner="" className="mx-auto w-full max-w-[80rem] px-6 lg:px-10">
        {/* Headline block — centered, matching the hero's rhythm */}
        <div className="relative mx-auto max-w-[56rem] text-center">
          {/* soft scrim so the statement stays crisp over the fluid */}
          <div
            aria-hidden="true"
            className="absolute -z-10"
            style={{
              inset: "-12% -25%",
              background:
                "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(10, 14, 26, 0.85) 0%, rgba(10, 14, 26, 0.5) 50%, transparent 75%)",
            }}
          />
          <Reveal>
            <p className="uppercase" style={mono}>
              01 — Proof
            </p>
          </Reveal>
          {/* scrub-built statement — no data-reveal: SplitText owns it */}
          <h2
            id="proof-heading"
            ref={headlineRef}
            className="mx-auto mt-[var(--space-6)] max-w-[24ch]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--step-6)",
              fontWeight: 480,
              lineHeight: 1.08,
              letterSpacing: "-0.015em",
              color: "var(--text)",
              textWrap: "balance",
            }}
          >
            The difference between a demo and a system is{" "}
            <em style={{ color: "var(--accent)", fontWeight: 440 }}>measurability</em>.
          </h2>
        </div>

        {/* Figures — ONE liquid-glass panel, three defensible metrics in a
            clean single row (100% leads: cyan + largest) */}
        <div
          className="glass-liquid mx-auto mt-[var(--space-16)] max-w-[64rem] rounded-3xl lg:mt-[var(--space-24)]"
          style={{ padding: "clamp(2.5rem, 6vw, 4.5rem)" }}
        >
          <div className="glass-liquid-content grid grid-cols-1 items-start gap-y-[var(--space-12)] md:grid-cols-3 md:gap-x-[var(--space-12)] md:gap-y-0">
            {METRICS.map((m, i) => (
              <Reveal key={m.caption} delay={i * 0.08} onRevealStart={() => startCount(i)}>
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: m.accent ? "var(--display)" : "var(--step-6)",
                    fontWeight: 460,
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                    color: m.accent ? "var(--accent)" : "var(--text)",
                    fontVariantNumeric: "tabular-nums", // steady width while counting
                  }}
                >
                  <span
                    ref={(el) => {
                      numberRefs.current[i] = el;
                    }}
                  >
                    {m.value}
                  </span>
                  {m.suffix && (
                    <span style={{ fontSize: "0.45em", letterSpacing: "0" }}>{m.suffix}</span>
                  )}
                </p>
                <p
                  className="mt-[var(--space-3)] uppercase"
                  style={{ ...mono, maxWidth: "30ch", lineHeight: 1.7 }}
                >
                  {m.caption}
                </p>
                <p
                  className="mt-[var(--space-1)]"
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: "0.7rem",
                    letterSpacing: "0.05em",
                    color: "rgba(138, 150, 180, 0.72)",
                    maxWidth: "34ch",
                    lineHeight: 1.6,
                  }}
                >
                  › {m.context}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
