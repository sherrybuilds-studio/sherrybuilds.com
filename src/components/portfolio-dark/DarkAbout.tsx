"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP, EASE, STAGGER } from "@/lib/gsap";

const CURRENTLY = [
  { label: "Location", value: "Berlin" },
  { label: "Studying", value: "BSc Computer Science, Arden University" },
  { label: "Focus", value: "AI systems · Full-stack" },
  { label: "Open to", value: "Werkstudent roles" },
];

const mono: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--step--1)",
  letterSpacing: "0.08em",
  color: "var(--muted)",
};

export default function DarkAbout() {
  const scope = useRef<HTMLElement>(null);

  // Richer entrance in the site's own language (same ease/stagger tokens):
  // headline lines mask up, card fades, monogram scales in, then bio
  // paragraphs and Currently rows stagger one by one.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const h2 = scope.current?.querySelector("h2");
        if (!h2) return;
        const split = SplitText.create(h2, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit(self) {
            (self.masks as HTMLElement[]).forEach((m) => {
              m.style.paddingBottom = "0.18em";
              m.style.marginBottom = "-0.18em";
            });
            return gsap
              .timeline({
                scrollTrigger: { trigger: scope.current, start: "clamp(top 70%)" },
                defaults: { ease: EASE },
              })
              .fromTo(".about-kicker", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 0)
              .fromTo(self.lines, { yPercent: 115 }, { yPercent: 0, duration: 0.9, stagger: 0.11 }, 0.1)
              .fromTo(".about-card", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.35)
              .fromTo(
                ".about-mono",
                { autoAlpha: 0, scale: 0.9 },
                { autoAlpha: 1, scale: 1, duration: 1.1 },
                0.5
              )
              .fromTo(
                ".about-item",
                { autoAlpha: 0, y: 16 },
                { autoAlpha: 1, y: 0, duration: 0.55, stagger: STAGGER },
                0.55
              );
          },
        });
        return () => split.revert();
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set([".about-kicker", ".about-card", ".about-mono", ".about-item"], {
          autoAlpha: 1,
          y: 0,
          scale: 1,
        });
      });
    },
    { scope }
  );

  return (
    <section
      id="about"
      ref={scope}
      aria-labelledby="about-heading"
      data-chapter=""
      className="relative overflow-hidden"
      style={{ paddingBlock: "clamp(6rem, 14vh, 10rem)" }}
    >
      <div data-chapter-inner="" className="mx-auto w-full max-w-[80rem] px-6 lg:px-10">
        {/* Headline — centered, house scrim */}
        <div className="relative mx-auto max-w-[56rem] text-center">
          <div
            aria-hidden="true"
            className="absolute -z-10"
            style={{
              inset: "-12% -25%",
              background:
                "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(10, 14, 26, 0.92) 0%, rgba(10, 14, 26, 0.62) 50%, transparent 78%)",
            }}
          />
          <p className="about-kicker uppercase" data-reveal="" style={mono}>
            05 — About
          </p>
          <h2
            id="about-heading"
            className="mx-auto mt-[var(--space-6)] max-w-[20ch]"
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
            The person behind the{" "}
            <em style={{ color: "var(--accent)", fontWeight: 440 }}>systems</em>.
          </h2>
        </div>

        {/* Bio card */}
        <div
          className="about-card glass glass-glow relative mx-auto mt-[var(--space-16)] max-w-[64rem] overflow-hidden rounded-3xl lg:mt-[var(--space-24)]"
          data-reveal=""
        >
          <span
            aria-hidden="true"
            className="about-mono pointer-events-none absolute select-none"
            style={{
              top: "-0.22em",
              right: "-0.04em",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: "clamp(10rem, 24vw, 17rem)",
              lineHeight: 1,
              color: "rgba(140, 160, 200, 0.07)",
              zIndex: 0,
            }}
          >
            S<span style={{ color: "rgba(34, 211, 238, 0.13)" }}>.</span>
          </span>
          <div
            className="relative z-[1] grid grid-cols-1 gap-[var(--space-8)] lg:grid-cols-12 lg:gap-[var(--space-12)]"
            style={{ padding: "clamp(2rem, 5vw, 3.5rem)" }}
          >
            <div className="lg:col-span-7">
              <p
                className="about-item"
                style={{
                  fontSize: "var(--step-1)",
                  lineHeight: 1.7,
                  color: "var(--text)",
                  fontWeight: 420,
                }}
              >
                I&apos;m Shehryar, a computer science student at Arden
                University in Berlin. For the past four months I&apos;ve built
                and operated a production AI stack on my own server — Linux and
                Docker underneath, RAG and eval layers in the middle, and the
                frontend you&apos;re reading now on top.
              </p>
              <p
                className="about-item mt-[var(--space-6)]"
                style={{ fontSize: "var(--step-1)", lineHeight: 1.7, color: "var(--text)", fontWeight: 420 }}
              >
                I work eval-first. The part that separates a demo from a system
                is evaluation, tracing, and cost — so every project here ships
                with a dated eval result and a Langfuse trace behind it. When
                something breaks, I&apos;d rather fix the cause than the
                symptom: when a bot token showed up in a log, I fixed the
                logger, not just the key.
              </p>
              <p
                className="about-item mt-[var(--space-6)]"
                style={{ fontSize: "var(--step-1)", lineHeight: 1.7, color: "var(--text)", fontWeight: 420 }}
              >
                When a product needs to speak more than one language — English,
                German, Urdu — I build that too.
              </p>
              <p
                className="about-item mt-[var(--space-6)]"
                style={{ fontSize: "var(--step-1)", lineHeight: 1.7, color: "var(--muted)" }}
              >
                Open to Werkstudent roles in Berlin. Remote-capable now, on-site
                from September.
              </p>
            </div>

            <div className="lg:col-span-4 lg:col-start-9">
              <p className="about-item uppercase" style={mono}>
                Currently
              </p>
              <dl className="mt-[var(--space-4)]">
                {CURRENTLY.map((c, i) => (
                  <div
                    key={c.label}
                    className={`about-item py-[var(--space-4)] ${i > 0 ? "border-t" : ""}`}
                  >
                    <dt className="uppercase" style={{ ...mono, fontSize: "0.7rem" }}>
                      {c.label}
                    </dt>
                    <dd
                      className="mt-[var(--space-1)]"
                      style={{ fontSize: "var(--step-0)", color: "var(--text)", fontWeight: 450 }}
                    >
                      {c.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
