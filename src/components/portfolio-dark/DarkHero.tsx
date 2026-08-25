"use client";

import { useRef } from "react";
import { gsap, useGSAP, EASE, STAGGER } from "@/lib/gsap";
import MorphWord from "@/components/portfolio/MorphWord";

export default function DarkHero() {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const lines = gsap.utils.toArray<HTMLElement>(".hero-line-inner");
        gsap.set(lines, { yPercent: 118, autoAlpha: 1 });

        gsap
          .timeline({ defaults: { ease: EASE } })
          .to(lines, { yPercent: 0, duration: 0.9, stagger: 0.11 }, 0.15)
          .fromTo(
            [".hero-chip", ".hero-sub", ".hero-ctas"],
            { autoAlpha: 0, y: 18 },
            { autoAlpha: 1, y: 0, duration: 0.6, stagger: STAGGER },
            "-=0.55"
          )
;
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(
          [".hero-line-inner", ".hero-chip", ".hero-sub", ".hero-ctas"],
          { autoAlpha: 1, y: 0, yPercent: 0 }
        );
      });
    },
    { scope }
  );

  return (
    <section
      id="hero"
      ref={scope}
      data-chapter=""
      className="relative flex min-h-[100svh] items-center overflow-hidden"
    >
      {/* No hero object — the ferrofluid background + centered type IS the hero */}
      <div
        data-chapter-inner=""
        className="relative z-10 mx-auto w-full max-w-[80rem] px-6 lg:px-10"
      >
        <div className="relative mx-auto flex max-w-[52rem] flex-col items-center text-center">
          {/* readability scrim — soft radial dark pool behind the text block */}
          <div
            aria-hidden="true"
            className="absolute -z-10"
            style={{
              inset: "-18% -30%",
              background:
                "radial-gradient(ellipse 60% 55% at 50% 48%, rgba(10, 14, 26, 0.9) 0%, rgba(10, 14, 26, 0.6) 45%, transparent 72%)",
            }}
          />
          <div
            className="flex flex-col items-center"
            style={{
              paddingTop: "calc(var(--nav-height) + var(--space-8))",
              paddingBottom: "var(--space-16)",
            }}
          >
            {/* Chip — glass */}
            <p
              className="hero-chip glass inline-flex items-center gap-2 whitespace-nowrap rounded-full uppercase"
              data-reveal=""
              style={{
                padding: "var(--space-2) var(--space-4)",
                fontFamily: "var(--font-label)",
                fontSize: "clamp(0.62rem, 2.7vw, var(--step--1))",
                letterSpacing: "0.08em",
                color: "var(--muted)",
              }}
            >
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  background: "var(--accent)",
                  boxShadow: "0 0 8px rgba(34, 211, 238, 0.8)",
                }}
              />
              Available · Berlin · Werkstudent
            </p>

            {/* Headline */}
            <h1
              className="mt-[var(--space-8)]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--display)",
                fontWeight: 480,
                // 1.1 reserves room between lines: "intelligent"'s descenders
                // and the capitalized morph word can no longer interpenetrate
                lineHeight: 1.1,
                letterSpacing: "-0.015em",
                color: "var(--text)",
              }}
            >
              {/* each mask gets 0.18em of descender room (padding + negative
                  margin) so Fraunces tails are never sheared by the clip */}
              <span
                className="hero-line block overflow-hidden"
                style={{ paddingBottom: "0.18em", marginBottom: "-0.18em" }}
              >
                <span className="hero-line-inner block" data-reveal="">
                  Architecting
                </span>
              </span>
              <span
                className="hero-line block overflow-hidden"
                style={{ paddingBottom: "0.18em", marginBottom: "-0.18em" }}
              >
                <span
                  className="hero-line-inner block italic"
                  data-reveal=""
                  style={{ fontWeight: 420 }}
                >
                  intelligent
                </span>
              </span>
              <span
                className="hero-line block overflow-hidden"
                style={{ paddingBottom: "0.18em", marginBottom: "-0.18em" }}
              >
                <span className="hero-line-inner block" data-reveal="">
                  <MorphWord />.
                </span>
              </span>
            </h1>

            {/* Sub */}
            <p
              className="hero-sub mx-auto mt-[var(--space-8)] max-w-[46ch]"
              data-reveal=""
              style={{ fontSize: "var(--step-1)", color: "var(--muted)", lineHeight: 1.55 }}
            >
              I build AI systems that run in production: a phone receptionist
              answering real calls in Berlin, an agent fleet that heals itself,
              and RAG pipelines with the evals and tracing to prove they work.
              Open to Werkstudent roles.
            </p>

            {/* CTAs — cyan glass primary, glass-outline secondary */}
            <div
              className="hero-ctas mt-[var(--space-12)] flex w-full flex-col items-center justify-center gap-[var(--space-4)] sm:w-auto sm:flex-row"
              data-reveal=""
            >
              <a
                href="#work"
                className="glass pf-btn inline-flex items-center rounded-full px-7 font-medium"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(34, 211, 238, 0.22), rgba(34, 211, 238, 0.10))",
                  borderColor: "rgba(34, 211, 238, 0.40)",
                  color: "var(--text)",
                  height: "3rem",
                  fontSize: "0.95rem",
                }}
              >
                View work
              </a>
              <a
                href="#demo"
                className="glass pf-btn inline-flex items-center gap-1 rounded-full px-7 font-medium"
                style={{
                  background: "transparent",
                  color: "var(--text)",
                  height: "3rem",
                  fontSize: "0.95rem",
                }}
              >
                Call the live demo <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
