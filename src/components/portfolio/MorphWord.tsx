"use client";

import { useRef } from "react";
import { gsap, useGSAP, EASE } from "@/lib/gsap";

const WORDS = ["Systems", "Agents", "Pipelines", "Evidence"];
const HOLD = 3; // seconds each word stays
const OUT = 0.3; // exit — accelerates away
const IN = 0.45; // enter — soft landing

/**
 * Layout-safe morphing word: the container width tweens to the next word's
 * measured width while the words mask-swap vertically, so the trailing
 * period never jumps. Reduced motion → static first word.
 */
export default function MorphWord() {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const aRef = useRef<HTMLSpanElement>(null);
  const bRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const wrap = wrapRef.current;
      const a = aRef.current;
      const b = bRef.current;
      const measure = measureRef.current;
      if (!wrap || !a || !b || !measure) return;

      const widthOf = (word: string) => {
        measure.textContent = word;
        return measure.offsetWidth;
      };

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        // Static first word only — park the second span out of sight.
        gsap.set(wrap, { width: "auto" });
        gsap.set(a, { yPercent: 0, autoAlpha: 1 });
        gsap.set(b, { autoAlpha: 0 });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        let index = 0;
        let front = a;
        let back = b;

        gsap.set(wrap, { width: widthOf(WORDS[0]) });
        gsap.set(b, { yPercent: 115, autoAlpha: 0 });

        const cycle = () => {
          const next = WORDS[(index + 1) % WORDS.length];
          back.textContent = next;
          // park the incoming word hidden below the mask until the outgoing
          // word has FULLY left — the two are never visible at once, so
          // glyphs can't double-expose mid-swap
          gsap.set(back, { yPercent: 115, autoAlpha: 0 });

          gsap
            .timeline({
              onComplete: () => {
                [front, back] = [back, front];
                index += 1;
                gsap.delayedCall(HOLD, cycle);
              },
            })
            .to(front, { yPercent: -115, autoAlpha: 0, duration: OUT, ease: "power2.in" }, 0)
            .set(back, { autoAlpha: 1 }, OUT)
            // width moves WITH the incoming word — never against a resting
            // word, so the trailing period stays visually attached
            .to(wrap, { width: widthOf(next), duration: IN, ease: EASE }, OUT)
            .to(back, { yPercent: 0, duration: IN, ease: EASE }, OUT);
        };

        gsap.delayedCall(HOLD, cycle);
      });
    },
    { scope: wrapRef }
  );

  return (
    <>
      <span className="sr-only">Systems</span>
      <span
        ref={wrapRef}
        aria-hidden="true"
        className="relative inline-block overflow-hidden align-bottom"
        // bottom padding + negative margin: descenders (p, g) render inside
        // the clip window instead of being sheared at the line box edge
        style={{ color: "var(--accent)", paddingBottom: "0.18em", marginBottom: "-0.18em" }}
      >
        {/* invisible sizer keeps the line height honest */}
        <span className="invisible inline-block">{WORDS[0]}</span>
        <span ref={aRef} className="absolute left-0 top-0 inline-block">
          {WORDS[0]}
        </span>
        <span ref={bRef} className="absolute left-0 top-0 inline-block">
          {WORDS[1]}
        </span>
        {/* offscreen measurer, same metrics as the visible words */}
        <span
          ref={measureRef}
          className="pointer-events-none invisible absolute left-0 top-0 inline-block whitespace-nowrap"
        />
      </span>
    </>
  );
}
