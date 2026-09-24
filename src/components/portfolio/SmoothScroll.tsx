"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

/** Lenis smooth scroll, driven by the GSAP ticker so ScrollTrigger stays in sync. */
export default function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    // Touch devices keep NATIVE scroll. Lenis virtualizes scrolling on the
    // main thread — exactly the frame budget a mid-range phone doesn't have
    // (2026-09-24 throttled-mobile audit: p50 frame 100ms with the full
    // pipeline). ScrollTrigger listens to native scroll on its own; anchor
    // clicks get compositor-driven native smooth jumps instead, and CSS
    // scroll-margin-top keeps the nav offset correct.
    if (window.matchMedia("(pointer: coarse)").matches) {
      const onTouchClick = (e: MouseEvent) => {
        const a = (e.target as HTMLElement).closest?.('a[href^="#"]');
        if (!a) return;
        const href = a.getAttribute("href");
        if (!href || href.length < 2) return;
        const el = document.querySelector(href);
        if (!el) return;
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth" });
        history.pushState(null, "", href);
      };
      document.addEventListener("click", onTouchClick);
      return () => document.removeEventListener("click", onTouchClick);
    }

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Lenis owns anchor navigation (CSS smooth-scroll would fight it):
    const NAV_OFFSET = -88; // matches the sections' scroll-margin-top
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href^="#"]');
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.length < 2) return;
      const el = document.querySelector(href);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el as HTMLElement, { offset: NAV_OFFSET, duration: 1.1 });
      history.pushState(null, "", href);
    };
    document.addEventListener("click", onClick);

    // Landing directly on /#section: jump there once everything is laid out
    if (window.location.hash) {
      const el = document.querySelector(window.location.hash);
      if (el) {
        requestAnimationFrame(() =>
          lenis.scrollTo(el as HTMLElement, { offset: NAV_OFFSET, immediate: true })
        );
      }
    }

    return () => {
      document.removeEventListener("click", onClick);
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return null;
}
