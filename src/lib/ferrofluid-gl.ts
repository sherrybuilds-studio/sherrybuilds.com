/**
 * WebGL plumbing for the Ferrofluid ambient background — the part that can
 * be unit-tested without a browser.
 *
 * Why this file exists (2026-09-10): on Samsung/Android Chrome the ambient
 * layer painted nothing while iOS was fine. The shader declared
 * `precision mediump float` and hashed with `fract(sin(x) * 43758.5453)`;
 * GPUs that honour mediump literally (Mali, Xclipse, older Adreno) collapse
 * that hash to near-constant values, the ridged noise never crosses its
 * thresholds, and the canvas composites fully transparent. Apple GPUs run
 * mediump at high precision, which is why iPhones never showed it.
 *
 * Two independent defences:
 *  1. Ask for highp when the GPU offers it (`GL_FRAGMENT_PRECISION_HIGH`).
 *  2. Treat WebGL as an enhancement: probe → compile → link → context-loss
 *     handler, and let the caller fall back to a static CSS layer on any
 *     failure. No pixel parity is chased — the site must look designed, not
 *     identical, when the GPU path is unavailable.
 */

export type ProbeResult =
  | { ok: true; gl: WebGLRenderingContext }
  | { ok: false; reason: 'no-webgl' | 'context-lost' }

export type BackgroundMode = 'canvas' | 'static'

const CONTEXT_ATTRS: WebGLContextAttributes = {
  alpha: true,
  antialias: false,
  depth: false,
  powerPreference: 'low-power',
  // The compositor must never paint a dead canvas opaque white; keep the
  // buffer so a lost context still reads as transparent over the base layer.
  preserveDrawingBuffer: false,
}

/** Try `webgl`, then the legacy `experimental-webgl` alias. */
export function probeWebGL(canvas: HTMLCanvasElement): ProbeResult {
  let gl: WebGLRenderingContext | null = null
  try {
    gl =
      (canvas.getContext('webgl', CONTEXT_ATTRS) as WebGLRenderingContext | null) ??
      (canvas.getContext('experimental-webgl', CONTEXT_ATTRS) as WebGLRenderingContext | null)
  } catch {
    gl = null
  }
  if (!gl) return { ok: false, reason: 'no-webgl' }
  if (typeof gl.isContextLost === 'function' && gl.isContextLost()) {
    return { ok: false, reason: 'context-lost' }
  }
  return { ok: true, gl }
}

/** Reduced motion or a missing GPU path both mean the static layer. */
export function backgroundMode(input: { reducedMotion: boolean; webglOk: boolean }): BackgroundMode {
  if (input.reducedMotion) return 'static'
  return input.webglOk ? 'canvas' : 'static'
}

/**
 * Compile + link with status checks. Returns null on any failure so the
 * caller can fall back instead of driving a half-built program (which is
 * what silently painted nothing before).
 */
export function buildProgram(
  gl: WebGLRenderingContext,
  vert: string = VERT,
  frag: string = FRAG
): WebGLProgram | null {
  const compile = (type: number, src: string): WebGLShader | null => {
    const s = gl.createShader(type)
    if (!s) return null
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      gl.deleteShader(s)
      return null
    }
    return s
  }
  const vs = compile(gl.VERTEX_SHADER, vert)
  if (!vs) return null
  const fs = compile(gl.FRAGMENT_SHADER, frag)
  if (!fs) {
    gl.deleteShader(vs)
    return null
  }
  const prog = gl.createProgram()
  if (!prog) return null
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog)
    return null
  }
  return prog
}

/**
 * `webglcontextlost` fires when Android reclaims the GPU (backgrounding,
 * memory pressure, driver reset). preventDefault keeps the canvas eligible
 * for restoration; the caller hides the canvas so the static layer shows.
 */
export function attachContextLossHandler(canvas: HTMLCanvasElement, onLost: () => void): () => void {
  const handler = (e: Event) => {
    e.preventDefault()
    onLost()
  }
  canvas.addEventListener('webglcontextlost', handler)
  return () => canvas.removeEventListener('webglcontextlost', handler)
}

export const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

export const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
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
`
