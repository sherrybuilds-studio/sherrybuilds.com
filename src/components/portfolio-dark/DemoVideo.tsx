"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/gsap";

const mono: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--step--1)",
  letterSpacing: "0.08em",
  color: "var(--muted)",
};

/* ────────────────────────────────────────────────────────────────────
   DEMO FOOTAGE SWAP POINT
   Drop each recording at  public/demos/<name>.mp4  (H.264, muted-safe)
   and optionally a poster at  public/demos/<name>.jpg .
   Names in use: voice-call-demo, telegram-digest-walkthrough,
   rag-commerce-agent, agent-pipeline.
   Behavior: lazy (preload=none), autoplays muted+looped only while in
   view, pauses offscreen, poster/placeholder under reduced motion or
   until footage exists. No code changes needed when files land.
   ──────────────────────────────────────────────────────────────────── */
export default function DemoVideo({
  name,
  index,
  title,
  placeholder,
}: {
  name: string;
  index: string;
  title: string;
  placeholder?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false); // real footage loaded

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // NOTE: the <video> always renders (conditional DOM here caused an SSR
    // hydration mismatch under reduced motion) — playback alone is gated,
    // checked LIVE so an OS toggle takes effect without reload.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !prefersReducedMotion()) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  return (
    <div
      className="glass relative aspect-video w-full overflow-hidden rounded-2xl"
      aria-label={`Demo preview: ${title}`}
    >
      {/* placeholder art — visible until real footage loads (or always
          under reduced motion) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 flex flex-col items-center justify-center gap-4"
        style={{
          background:
            "radial-gradient(80% 90% at 70% 20%, rgba(59, 130, 246, 0.16), transparent 65%), radial-gradient(70% 80% at 25% 85%, rgba(34, 211, 238, 0.10), transparent 70%), linear-gradient(160deg, #0d1322 0%, #0a0e1a 100%)",
        }}
      >
        <span
          className="glass flex h-14 w-14 items-center justify-center rounded-full"
          style={{ color: "var(--accent)" }}
        >
          <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor" aria-hidden="true">
            <path d="M0 0 L16 9 L0 18 Z" />
          </svg>
        </span>
        <span className="uppercase" style={{ ...mono, fontSize: "0.7rem" }}>
          {placeholder ?? `${index} · demo preview`}
        </span>
      </div>

      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover transition-opacity"
        style={{ opacity: ready ? 1 : 0, transitionDuration: "var(--dur-ui)" }}
        src={`/demos/${name}.mp4`}
        poster={`/demos/${name}.jpg`}
        muted
        loop
        playsInline
        preload="none"
        onLoadedData={() => setReady(true)}
      />
    </div>
  );
}
