"use client";

import { useRef } from "react";
import { gsap, useGSAP, EASE, STAGGER } from "@/lib/gsap";
import MorphWord from "./MorphWord";

export default function Hero() {
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
          );
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
      className="relative flex min-h-[100svh] items-center overflow-hidden"
    >
      <div className="relative z-10 mx-auto w-full max-w-[80rem] px-6 lg:px-10">
        <div className="grid grid-cols-12">
          <div
            className="col-span-12 lg:col-span-7"
            style={{
              paddingTop: "calc(var(--nav-height) + var(--space-12))",
              paddingBottom: "var(--space-16)",
            }}
          >
            {/* Chip */}
            <p
              className="hero-chip inline-flex items-center gap-2 whitespace-nowrap rounded-full border bg-[var(--surface)] uppercase"
              data-reveal=""
              style={{
                borderColor: "var(--border)",
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
                style={{ background: "#16a34a" }}
              />
              Based in Berlin · Available for AI engineering work
            </p>

            {/* Headline */}
            <h1
              className="mt-[var(--space-8)]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--display)",
                fontWeight: 480,
                lineHeight: 1.04,
                letterSpacing: "-0.015em",
              }}
            >
              <span className="hero-line block overflow-hidden">
                <span className="hero-line-inner block" data-reveal="">
                  Architecting
                </span>
              </span>
              <span className="hero-line block overflow-hidden">
                <span
                  className="hero-line-inner block italic"
                  data-reveal=""
                  style={{ fontWeight: 420 }}
                >
                  intelligent
                </span>
              </span>
              <span className="hero-line block overflow-hidden">
                <span className="hero-line-inner block" data-reveal="">
                  <MorphWord />.
                </span>
              </span>
            </h1>

            {/* Sub */}
            <p
              className="hero-sub mt-[var(--space-8)] max-w-[46ch]"
              data-reveal=""
              style={{ fontSize: "var(--step-1)", color: "var(--muted)", lineHeight: 1.55 }}
            >
              AI Automation Engineer building production LLM systems — RAG
              pipelines, autonomous agents, full observability.
              Based in Berlin · Available for AI engineering work.
            </p>

            {/* CTAs */}
            <div
              className="hero-ctas mt-[var(--space-12)] flex flex-wrap items-center gap-[var(--space-6)]"
              data-reveal=""
            >
              <a
                href="#work"
                className="inline-flex items-center rounded-full px-7 font-medium text-white"
                style={{
                  background: "var(--accent)",
                  height: "3rem",
                  fontSize: "0.95rem",
                  transition:
                    "transform var(--dur-ui) var(--ease), box-shadow var(--dur-ui) var(--ease)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 12px 32px -10px rgba(79,70,229,0.55)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "";
                }}
              >
                View work
              </a>
              <a
                href="#contact"
                className="pf-underline inline-flex min-h-11 items-center gap-1 font-medium"
                style={{ fontSize: "0.95rem", color: "var(--text)" }}
              >
                Get in touch <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
