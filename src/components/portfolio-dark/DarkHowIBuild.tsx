"use client";

import { useRef } from "react";
import Reveal from "@/components/portfolio/Reveal";
import { gsap, ScrollTrigger, useGSAP, EASE } from "@/lib/gsap";

const STEPS = [
  {
    title: "Understand",
    description:
      "Define the real problem and what “working” means in numbers before writing code.",
  },
  {
    title: "Architect",
    description:
      "Design retrieval, agents, data flow, and failure modes together — not failure modes last.",
  },
  {
    title: "Build & evaluate",
    description:
      "Ship with an eval gate in CI, so quality is proven on every commit, not claimed once.",
  },
  {
    title: "Observe & iterate",
    description: "Trace every LLM call in production; tune on real usage and real cost.",
  },
];

const mono: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--step--1)",
  letterSpacing: "0.08em",
  color: "var(--muted)",
};

export default function DarkHowIBuild() {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const panels = gsap.utils.toArray<HTMLElement>(".hib-panel");
        const entered: boolean[] = panels.map(() => false);

        // active tracking + continuous center-distance dimming
        let active = -1;
        const update = () => {
          const mid = window.innerHeight / 2;
          let best = -1;
          let bestD = Infinity;
          panels.forEach((panel, i) => {
            if (!entered[i]) return;
            const r = panel.getBoundingClientRect();
            const d = Math.abs(r.top + r.height / 2 - mid);
            if (d < bestD) {
              bestD = d;
              best = i;
            }
            const dn = Math.min(1, d / mid);
            panel.style.opacity = Math.max(0.4, 1 - dn * 0.6).toFixed(3);
          });
          if (best !== active) {
            active = best;
            panels.forEach((panel, i) => panel.classList.toggle("is-active", i === best));
          }
        };
        update();
        const st = ScrollTrigger.create({
          trigger: scope.current,
          start: "top bottom",
          end: "bottom top",
          onUpdate: update,
        });
        ScrollTrigger.addEventListener("refresh", update);

        // one-by-one entrance: fade + 30px rise + slight scale. Each panel
        // joins active/dim tracking the moment its entrance completes —
        // update() is re-run there because it otherwise only fires on scroll.
        panels.forEach((panel, i) => {
          gsap.set(panel, { autoAlpha: 0, y: 30, scale: 0.97 });
          ScrollTrigger.create({
            trigger: panel,
            start: "clamp(top 88%)",
            once: true,
            onEnter: () =>
              gsap.to(panel, {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: 0.7,
                ease: EASE,
                onComplete: () => {
                  entered[i] = true;
                  // hand transform control to the .is-active CSS class
                  gsap.set(panel, { clearProps: "transform" });
                  update();
                },
              }),
          });
        });

        // progress line fills cyan as you step through the process
        gsap.fromTo(
          ".hib-line-fill",
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            transformOrigin: "top center",
            scrollTrigger: {
              trigger: ".hib-steps",
              start: "clamp(top 60%)",
              end: "clamp(bottom 50%)",
              scrub: true,
            },
          }
        );

        return () => {
          ScrollTrigger.removeEventListener("refresh", update);
          st.kill();
        };
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".hib-panel", { autoAlpha: 1, y: 0, scale: 1, opacity: 1 });
        gsap.set(".hib-line-fill", { scaleY: 1 });
      });
    },
    { scope }
  );

  return (
    <section
      id="how"
      ref={scope}
      aria-labelledby="how-heading"
      data-chapter=""
      className="relative overflow-hidden"
      style={{ paddingBlock: "clamp(6rem, 14vh, 10rem)" }}
    >
      <div data-chapter-inner="" className="mx-auto w-full max-w-[80rem] px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-y-[var(--space-12)] lg:grid-cols-12 lg:gap-x-[var(--space-8)]">
          {/* LEFT — sticky headline column */}
          <div className="lg:col-span-5">
            {/* top offset is lg-only: on mobile this block is static in flow —
                a relative `top` here visually shifted it over the first card */}
            <div className="relative lg:sticky lg:top-[calc(var(--nav-height)+var(--space-16))]">
              <div
                aria-hidden="true"
                className="absolute -z-10"
                style={{
                  inset: "-15% -20%",
                  background:
                    "radial-gradient(ellipse 65% 60% at 50% 50%, rgba(10, 14, 26, 0.85) 0%, rgba(10, 14, 26, 0.5) 55%, transparent 78%)",
                }}
              />
              <Reveal>
                <p className="uppercase" style={mono}>
                  03 — How I Build
                </p>
                <h2
                  id="how-heading"
                  className="mt-[var(--space-6)] max-w-[14ch]"
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
                  How I build systems that{" "}
                  <em style={{ color: "var(--accent)", fontWeight: 440 }}>ship</em>.
                </h2>
              </Reveal>
            </div>
          </div>

          {/* RIGHT — steps + progress line */}
          <div className="hib-steps relative pl-[var(--space-6)] lg:col-span-6 lg:col-start-7">
            {/* progress line: track + cyan scroll-fill */}
            <div
              aria-hidden="true"
              className="absolute bottom-0 left-0 top-0 w-[2px]"
              style={{ background: "rgba(255, 255, 255, 0.08)" }}
            />
            <div
              aria-hidden="true"
              className="hib-line-fill absolute bottom-0 left-0 top-0 w-[2px]"
              style={{
                background: "var(--accent)",
                boxShadow: "0 0 12px rgba(34, 211, 238, 0.45)",
                transform: "scaleY(0)",
              }}
            />
            <ol className="flex flex-col gap-[var(--space-8)]">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  data-reveal=""
                  className="hib-panel glass glass-glow rounded-2xl"
                  style={{ padding: "clamp(1.5rem, 4vw, 2.25rem)" }}
                >
                  <span
                    aria-hidden="true"
                    className="hib-num"
                    style={{
                      fontFamily: "var(--font-label)",
                      fontSize: "var(--step-2)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    0{i + 1}
                  </span>
                  <h3
                    className="mt-[var(--space-2)]"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--step-3)",
                      fontWeight: 480,
                      lineHeight: 1.15,
                      letterSpacing: "-0.015em",
                      color: "var(--text)",
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    className="mt-[var(--space-3)]"
                    style={{
                      fontSize: "var(--step-0)",
                      lineHeight: 1.65,
                      color: "var(--muted)",
                      maxWidth: "48ch",
                    }}
                  >
                    {s.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
