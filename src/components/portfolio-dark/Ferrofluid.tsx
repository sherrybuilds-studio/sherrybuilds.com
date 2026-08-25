"use client";

import { useEffect, useRef } from "react";

/**
 * Ferrofluid ambient background — THE one site-wide layer behind all
 * sections (replaces AuroraVeil in the slot; that file stays in the repo,
 * unmounted). Flowing liquid-metal tendrils built from ridged, domain-
 * warped value noise: thin bright filaments where the field crosses its
 * midline, with a faked directional sheen for the metallic feel.
 * Recolored to the site palette: navy base, blue mass, cyan crests.
 *
 * Raw WebGL, no libraries. Background discipline:
 * - low intensity (0.20 desktop / 0.12 mobile), thin filaments only —
 *   average luminance stays low so the glass object remains the star
 * - DPR capped at 1; mobile skips the fine second filament layer
 * - prefers-reduced-motion: one static frame (frozen blue gradient)
 * - rAF pauses on hidden tabs; context released on unmount
 */

const FRAG = `
precision mediump float;
uniform float uTime;
uniform vec2 uRes;
uniform float uIntensity;
uniform float uDetail;
uniform float uScroll; /* 0..1 page progress — camera depth (pan + zoom) */
/* per-section mood, all eased in JS between the 7 chapter states so the
   ONE shader morphs continuously through moods (never a hard cut): */
uniform float uCyan;   /* cyan mix in the tendrils (glow warmth) */
uniform float uTurb;   /* domain-warp amount — churn / chaos */
uniform float uWarm;   /* shift toward indigo for the About settle */
uniform float uBright; /* overall intensity */

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p, float t) {
  float v = 0.0;
  v += noise(p + vec2(t, -t * 0.6)) * 0.55;
  v += noise(p * 2.1 + vec2(-t * 0.7, t * 0.4)) * 0.3;
  v += noise(p * 4.3 + vec2(t * 0.3, t * 0.8)) * 0.15;
  return v;
}

float ridge(float n) { return 1.0 - abs(2.0 * n - 1.0); }

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  // scrolling moves the camera through the fluid: slow pan + gentle zoom
  vec2 p = vec2(uv.x * uRes.x / uRes.y, uv.y) * (1.4 + 0.18 * uScroll);
  p += vec2(uScroll * 0.3, uScroll * 0.85);

  float t = uTime * 0.05; // continuous, slow (flow SPEED eased in JS via uTime)

  // domain warp — the "magnetic" flow; uTurb drives churn per section
  vec2 warp = vec2(fbm(p + vec2(0.0, 3.7), t), fbm(p + vec2(5.2, 1.3), t * 0.85)) * uTurb;

  vec3 blue = vec3(0.231, 0.51, 0.965);   /* --accent-2 #3B82F6 */
  vec3 cyan = vec3(0.133, 0.827, 0.933);  /* --accent   #22D3EE */
  vec3 hot  = vec3(0.62, 0.94, 1.0);      /* near-white cyan for cores */
  vec3 warm = vec3(0.42, 0.40, 0.92);     /* indigo — the About settle */

  /* tendril colour eased per section: more cyan where uCyan is high,
     shifting toward indigo where uWarm is high (About). One continuous
     morph, no hard cuts. */
  vec3 coreCol = mix(mix(blue * 1.05, cyan, uCyan), warm, uWarm);
  vec3 haloCol = mix(mix(blue * 0.8, cyan * 0.85, uCyan * 0.7), warm * 0.7, uWarm);

  float glow = 0.0;
  vec3 col = vec3(0.0);

  // FAR tier — broad, dim blue masses (depth base)
  {
    float r = ridge(fbm(p * 0.7 + warp * 1.2, t * 0.7));
    float halo = pow(smoothstep(0.5, 1.0, r), 2.0) * 0.26;
    glow += halo;
    col += blue * 0.5 * halo;
  }

  // MID tier — main tendrils: bright core + wide soft bloom
  {
    float r = ridge(fbm(p * 1.15 + warp * 1.7, t));
    float core = pow(smoothstep(0.74, 1.0, r), 5.0) * 1.05;
    float bloom = pow(smoothstep(0.42, 1.0, r), 2.0) * 0.55;
    glow += core + bloom;
    col += coreCol * core + haloCol * bloom;
  }

  // NEAR tier — thin hot filaments (desktop only): brightest, closest
  if (uDetail > 1.5) {
    float r = ridge(fbm(p * 2.4 - warp * 1.3, t * 1.3));
    float core = pow(smoothstep(0.78, 1.0, r), 6.0) * 1.25;
    float halo = pow(smoothstep(0.55, 1.0, r), 2.5) * 0.34;
    glow += core + halo;
    col += mix(coreCol, hot, 0.5) * core + cyan * 0.7 * halo;
  }

  // vignette — navy deepens harder toward the edges; lit center = gloss
  vec2 cuv = uv - 0.5;
  cuv.x *= uRes.x / uRes.y;
  float vig = mix(0.36, 1.0, smoothstep(1.2, 0.22, length(cuv)));
  glow *= vig;
  col *= vig;

  // depth lift with scroll, brightness eased per section
  float k = uIntensity * (1.0 + 0.15 * uScroll) * uBright;
  float alpha = clamp(glow, 0.0, 1.0) * k;
  gl_FragColor = vec4(col * k, alpha); /* premultiplied */
}
`;

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export default function Ferrofluid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
    });
    if (!gl) return; // no WebGL → flat navy --bg carries it

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 767px)").matches;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
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
    // live (eased) + target mood, 5 params each
    const mood = MOODS[0].slice();
    const target = MOODS[0].slice();

    // page progress → shader depth (skipped under reduced motion)
    let scrollTarget = 0;
    let scrollCurrent = 0;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollTarget = max > 0 ? window.scrollY / max : 0;
    };
    if (!reduced) window.addEventListener("scroll", onScroll, { passive: true });

    // Desktop: DPR 1 (large area, soft glow — extra pixels buy nothing).
    // Mobile: up to 1.5x DPR so filaments stay crisp on 3x phone screens
    // instead of reading washed-out from upscaling.
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
    let phase = 40; // also the static frame for reduced motion
    let lastT: number | null = null;

    // Interpolate the mood for the current scroll position from the actual
    // section centres, so each chapter genuinely owns a state. Cheap: 7
    // getBoundingClientRect reads at 30fps.
    const computeTarget = () => {
      const secs = document.querySelectorAll<HTMLElement>("[data-chapter]");
      const n = Math.min(secs.length, N);
      if (n < 2) return; // sections not laid out yet — keep MOODS[0]
      const focus = window.scrollY + window.innerHeight * 0.5;
      const centre = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        return r.top + window.scrollY + r.height * 0.5;
      };
      let i = 0;
      while (i < n - 1 && centre(secs[i + 1]) < focus) i++;
      // blend between section i and i+1 by where focus sits between centres
      const c0 = centre(secs[i]);
      const c1 = centre(secs[Math.min(i + 1, n - 1)]);
      let f = c1 > c0 ? (focus - c0) / (c1 - c0) : 0;
      f = Math.min(1, Math.max(0, f));
      f = f * f * (3 - 2 * f); // smoothstep
      const a = MOODS[i];
      const b = MOODS[Math.min(i + 1, N - 1)];
      for (let k = 0; k < 5; k++) target[k] = lerp(a[k], b[k], f);
    };

    const draw = (timeSec: number) => {
      // eased follow so the depth shift glides with Lenis, never snaps
      scrollCurrent += (scrollTarget - scrollCurrent) * 0.06;

      computeTarget();
      for (let k = 0; k < 5; k++) mood[k] += (target[k] - mood[k]) * 0.045; // slow, tasteful

      const dt = lastT === null ? 0 : Math.min(timeSec - lastT, 0.1);
      lastT = timeSec;
      // organic breathing on top of the per-section flow speed
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
    if (reduced) {
      // static RICH frame, no morphing loop (accessibility): a mid-mood blend
      gl.uniform1f(uScroll, 0.4);
      gl.uniform1f(uCyan, 0.8);
      gl.uniform1f(uTurb, 1.0);
      gl.uniform1f(uWarm, 0.0);
      gl.uniform1f(uBright, 1.1);
      gl.uniform1f(uTime, 40);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      // PERF: cap to ~30fps (a soft ambient background gains nothing from 60)
      // and PAUSE entirely when the tab is hidden — the fixed full-viewport
      // canvas is otherwise always "on screen". Halving the frame rate halves
      // the fragment-shader + compositor cost of the background.
      const FRAME_MS = 1000 / 30;
      let last = -Infinity;
      const loop = (t: number) => {
        raf = requestAnimationFrame(loop);
        if (document.hidden) return; // pause when not in view (tab hidden)
        if (t - last < FRAME_MS) return; // throttle to ~30fps
        last = t;
        draw(t / 1000);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      // Release OUR GPU resources, but never loseContext() here: a canvas
      // hands back the SAME context object on every getContext() call, so
      // killing it makes the next mount inherit a dead context — every GL
      // call no-ops, the link check bails, and Chrome composites the dead
      // canvas OPAQUE WHITE over the page. React StrictMode remounts every
      // effect in dev, so that whited out the whole site on `next dev`
      // while production (single mount) rendered fine.
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 h-full w-full"
      style={{ zIndex: 0 }}
    />
  );
}
