"use client";

import { useEffect, useRef, useState } from "react";
import {
  attachContextLossHandler,
  backgroundMode,
  buildProgram,
  FRAG,
  probeWebGL,
  VERT,
  type BackgroundMode,
} from "@/lib/ferrofluid-gl";

/**
 * Ferrofluid ambient background — THE one site-wide layer behind all
 * sections. Flowing liquid-metal tendrils built from ridged, domain-warped
 * value noise, recoloured to the site palette: navy base, blue mass, cyan
 * crests. Raw WebGL, no libraries; shaders + capability plumbing live in
 * src/lib/ferrofluid-gl.ts (unit-tested).
 *
 * Two layers, always (2026-09-10, Android incident: the canvas painted
 * nothing on Samsung Chrome and the page fell back to flat navy):
 *   1. BASE — a static CSS gradient in the dark palette, server-rendered,
 *      so the very first paint is designed and it never depends on JS,
 *      GPU or timing. No background-attachment, no vh units: a fixed box
 *      with inset:0 is the Android-safe way to cover the viewport.
 *   2. CANVAS — an enhancement on top. It is trusted only after a real
 *      capability check (context → compile → link), it hands back to the
 *      base on webglcontextlost, and it steps aside when the first seconds
 *      run too slowly. prefers-reduced-motion never starts it at all.
 *
 * Background discipline (unchanged): low intensity, thin filaments, DPR
 * capped, ~30 fps, rAF paused on hidden tabs, GPU resources released on
 * unmount (but never loseContext() — see the cleanup comment).
 */

// Layered radial glows over the navy base: blue mass top-left, cyan crest
// right, blue depth at the foot — the fluid's palette, frozen.
const BASE_BACKGROUND = [
  "radial-gradient(60% 50% at 28% 18%, rgba(59, 130, 246, 0.22), transparent 70%)",
  "radial-gradient(45% 40% at 78% 62%, rgba(34, 211, 238, 0.14), transparent 70%)",
  "radial-gradient(70% 55% at 55% 100%, rgba(59, 130, 246, 0.12), transparent 70%)",
  "linear-gradient(180deg, #0a0e1a 0%, #0c1222 55%, #0a0e1a 100%)",
].join(", ");

// "Slow" guard: after a 2 s warm-up, if the mean interval between drawn
// frames over the next 40 frames is worse than this, the phone is software-
// rendering the shader — hand back to the static base instead of janking.
const SLOW_WARMUP_MS = 2000;
const SLOW_SAMPLE_FRAMES = 40;
const SLOW_MEAN_MS = 70;

export default function Ferrofluid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // SSR and first paint: static. The effect promotes to "canvas" only once
  // WebGL has actually produced a program.
  const [mode, setMode] = useState<BackgroundMode>("static");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setBg = (m: BackgroundMode) => {
      document.documentElement.dataset.bg = m;
      setMode(m);
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    if (backgroundMode({ reducedMotion: reduced, webglOk: true }) === "static") {
      setBg("static"); // accessibility: the static base IS the reduced-motion design
      return;
    }

    const probe = probeWebGL(canvas);
    if (!probe.ok) {
      setBg("static");
      return;
    }
    const gl = probe.gl;
    const prog = buildProgram(gl, VERT, FRAG);
    if (!prog) {
      setBg("static");
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const uTime = gl.getUniformLocation(prog, "uTime");
    const uRes = gl.getUniformLocation(prog, "uRes");
    const uIntensity = gl.getUniformLocation(prog, "uIntensity");
    const uDetail = gl.getUniformLocation(prog, "uDetail");
    const uScroll = gl.getUniformLocation(prog, "uScroll");
    const uCyan = gl.getUniformLocation(prog, "uCyan");
    const uTurb = gl.getUniformLocation(prog, "uTurb");
    const uWarm = gl.getUniformLocation(prog, "uWarm");
    const uBright = gl.getUniformLocation(prog, "uBright");

    // Mobile matches desktop richness: full 3-tier detail + near-equal
    // intensity. Affordable because the phone canvas has ~4x fewer pixels
    // than desktop even at 1.5x DPR (562x1218 vs 1440x900).
    gl.uniform1f(uIntensity, mobile ? 0.28 : 0.3);
    gl.uniform1f(uDetail, 2);
    gl.uniform1f(uScroll, 0);

    // ── PER-SECTION MOOD STATES ──────────────────────────────────────────
    // [flow speed, cyan mix, turbulence, warm(indigo), brightness].
    // Order matches the 7 [data-chapter] sections top→bottom. The live
    // values ease toward the section under the viewport centre, so the ONE
    // shader morphs continuously through these moods and reverses cleanly.
    const MOODS = [
      [0.62, 0.45, 0.85, 0.0, 0.9], // Hero    — calm, slow, deep navy
      [0.85, 0.68, 0.72, 0.0, 1.0], // Proof   — tighter, focused, brighter cyan
      [1.2, 0.85, 1.15, 0.0, 1.12], // Work    — more energy, richer glow
      [1.0, 0.66, 1.05, 0.0, 1.0], // How      — directional churn (process)
      [1.45, 0.72, 1.28, 0.0, 1.02], // Stack  — faster subtle churn
      [0.66, 0.5, 0.7, 0.45, 0.9], // About    — calm again, warm settle
      [0.98, 1.0, 0.9, 0.06, 1.22], // Contact — bright, inviting, most cyan
    ];
    const N = MOODS.length;
    const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
    const mood = MOODS[0].slice();
    const target = MOODS[0].slice();

    // page progress → shader depth
    let scrollTarget = 0;
    let scrollCurrent = 0;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollTarget = max > 0 ? window.scrollY / max : 0;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Desktop: DPR 1 (large area, soft glow — extra pixels buy nothing).
    // Mobile: up to 1.5x DPR so filaments stay crisp on 3x phone screens.
    const dpr = mobile ? Math.min(1.5, window.devicePixelRatio || 1) : 1;
    const resize = () => {
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    // Flow phase is INTEGRATED (not raw time) so its SPEED can ease per
    // section and breathe organically without time-jumps.
    let phase = 40;
    let lastT: number | null = null;

    // Interpolate the mood for the current scroll position from the actual
    // section centres, so each chapter genuinely owns a state.
    const computeTarget = () => {
      const secs = document.querySelectorAll<HTMLElement>("[data-chapter]");
      const n = Math.min(secs.length, N);
      if (n < 2) return;
      const focus = window.scrollY + window.innerHeight * 0.5;
      const centre = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        return r.top + window.scrollY + r.height * 0.5;
      };
      let i = 0;
      while (i < n - 1 && centre(secs[i + 1]) < focus) i++;
      const c0 = centre(secs[i]);
      const c1 = centre(secs[Math.min(i + 1, n - 1)]);
      let f = c1 > c0 ? (focus - c0) / (c1 - c0) : 0;
      f = Math.min(1, Math.max(0, f));
      f = f * f * (3 - 2 * f);
      const a = MOODS[i];
      const b = MOODS[Math.min(i + 1, N - 1)];
      for (let k = 0; k < 5; k++) target[k] = lerp(a[k], b[k], f);
    };

    const draw = (timeSec: number) => {
      scrollCurrent += (scrollTarget - scrollCurrent) * 0.06;
      computeTarget();
      for (let k = 0; k < 5; k++) mood[k] += (target[k] - mood[k]) * 0.045;
      const dt = lastT === null ? 0 : Math.min(timeSec - lastT, 0.1);
      lastT = timeSec;
      const breath = 0.12 * Math.sin(timeSec * 0.13) + 0.06 * Math.sin(timeSec * 0.041);
      phase += dt * mood[0] * (1.0 + breath);
      gl.uniform1f(uScroll, scrollCurrent);
      gl.uniform1f(uCyan, mood[1]);
      gl.uniform1f(uTurb, mood[2]);
      gl.uniform1f(uWarm, mood[3]);
      gl.uniform1f(uBright, mood[4]);
      gl.uniform1f(uTime, phase);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let raf = 0;
    let alive = true;
    const stop = () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
    // GPU reclaimed (Android backgrounding, memory pressure, driver reset):
    // stop drawing and let the base layer carry the page.
    const detachLoss = attachContextLossHandler(canvas, () => {
      stop();
      setBg("static");
    });

    // PERF: ~30 fps cap (a soft ambient background gains nothing from 60),
    // paused entirely while the tab is hidden.
    const FRAME_MS = 1000 / 30;
    let last = -Infinity;
    let firstDrawAt = -1;
    let sampled = 0;
    let sampledSum = 0;
    let prevDrawAt = -1;
    const loop = (t: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      if (t - last < FRAME_MS) return;
      last = t;
      draw(t / 1000);
      // slow-device guard (see constants above)
      if (firstDrawAt < 0) firstDrawAt = t;
      if (t - firstDrawAt > SLOW_WARMUP_MS && sampled < SLOW_SAMPLE_FRAMES) {
        if (prevDrawAt >= 0) {
          sampledSum += t - prevDrawAt;
          sampled++;
          if (sampled === SLOW_SAMPLE_FRAMES && sampledSum / sampled > SLOW_MEAN_MS) {
            stop();
            setBg("static");
            return;
          }
        }
        prevDrawAt = t;
      }
    };
    raf = requestAnimationFrame(loop);
    setBg("canvas");

    return () => {
      stop();
      detachLoss();
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      // Release OUR GPU resources, but never loseContext() here: a canvas
      // hands back the SAME context object on every getContext() call, so
      // killing it makes the next mount inherit a dead context — every GL
      // call no-ops and Chrome composites the dead canvas OPAQUE WHITE over
      // the page (React StrictMode remounts every effect in dev).
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <>
      <div
        aria-hidden="true"
        data-bg-base=""
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: 0, background: BASE_BACKGROUND }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-bg-canvas={mode}
        className="pointer-events-none fixed inset-0 h-full w-full"
        style={{
          zIndex: 0,
          // Fades in over the base once a frame exists; invisible (but laid
          // out, so clientWidth is real) whenever the GPU path is off.
          opacity: mode === "canvas" ? 1 : 0,
          transition: "opacity 600ms ease-out",
        }}
      />
    </>
  );
}
