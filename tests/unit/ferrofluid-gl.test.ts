import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  FRAG,
  probeWebGL,
  backgroundMode,
  buildProgram,
  attachContextLossHandler,
} from '../../src/lib/ferrofluid-gl.ts'

// Android/Samsung Chrome: the ambient background canvas painted nothing
// (2026-09-10). The site must always show a designed base layer, and the
// WebGL layer must only be trusted after a real capability check.

type Listener = (e: { preventDefault(): void }) => void
function fakeCanvas(contexts: Record<string, unknown>) {
  const listeners: Record<string, Listener[]> = {}
  return {
    calls: [] as string[],
    listeners,
    getContext(kind: string) {
      this.calls.push(kind)
      return kind in contexts ? contexts[kind] : null
    },
    addEventListener(type: string, fn: Listener) {
      ;(listeners[type] ??= []).push(fn)
    },
    removeEventListener(type: string, fn: Listener) {
      listeners[type] = (listeners[type] ?? []).filter((f) => f !== fn)
    },
  }
}

function fakeGL(opts: { link?: boolean; compile?: boolean } = {}) {
  const link = opts.link ?? true
  const compile = opts.compile ?? true
  return {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    deleted: [] as string[],
    createShader: () => ({ kind: 'shader' }),
    shaderSource: () => {},
    compileShader: () => {},
    createProgram: () => ({ kind: 'program' }),
    attachShader: () => {},
    linkProgram: () => {},
    getShaderParameter: (_s: unknown, p: number) => (p === 3 ? compile : true),
    getProgramParameter: (_p: unknown, p: number) => (p === 4 ? link : true),
    getShaderInfoLog: () => 'bad shader',
    getProgramInfoLog: () => 'bad link',
    deleteShader: () => {},
    deleteProgram: () => {},
    isContextLost: () => false,
  }
}

test('probeWebGL reports no-webgl when neither context kind is available', () => {
  const canvas = fakeCanvas({})
  const r = probeWebGL(canvas as never)
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'no-webgl')
  assert.deepEqual(canvas.calls, ['webgl', 'experimental-webgl'])
})

test('probeWebGL falls back to experimental-webgl and returns the context', () => {
  const gl = fakeGL()
  const canvas = fakeCanvas({ 'experimental-webgl': gl })
  const r = probeWebGL(canvas as never)
  assert.equal(r.ok, true)
  assert.equal(r.gl, gl)
})

test('probeWebGL reports context-lost when the context is already lost', () => {
  const gl = { ...fakeGL(), isContextLost: () => true }
  const r = probeWebGL(fakeCanvas({ webgl: gl }) as never)
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'context-lost')
})

test('buildProgram returns null when the shaders do not compile', () => {
  assert.equal(buildProgram(fakeGL({ compile: false }) as never), null)
})

test('buildProgram returns null when the program does not link', () => {
  assert.equal(buildProgram(fakeGL({ link: false }) as never), null)
})

test('buildProgram returns the program when compile and link succeed', () => {
  const prog = buildProgram(fakeGL() as never)
  assert.deepEqual(prog, { kind: 'program' })
})

test('backgroundMode: reduced motion always gets the static layer', () => {
  assert.equal(backgroundMode({ reducedMotion: true, webglOk: true }), 'static')
})

test('backgroundMode: no WebGL gets the static layer', () => {
  assert.equal(backgroundMode({ reducedMotion: false, webglOk: false }), 'static')
})

test('backgroundMode: motion allowed and WebGL working gets the canvas', () => {
  assert.equal(backgroundMode({ reducedMotion: false, webglOk: true }), 'canvas')
})

test('fragment shader asks for highp when the GPU offers it (mediump collapses the hash on Android GPUs)', () => {
  assert.match(FRAG, /#ifdef GL_FRAGMENT_PRECISION_HIGH\s+precision highp float;\s+#else\s+precision mediump float;\s+#endif/)
})

test('context loss handler prevents default, reports once, and can be detached', () => {
  const canvas = fakeCanvas({})
  let lost = 0
  const detach = attachContextLossHandler(canvas as never, () => lost++)
  assert.equal(canvas.listeners['webglcontextlost']?.length, 1)
  let prevented = false
  canvas.listeners['webglcontextlost'][0]({ preventDefault: () => (prevented = true) })
  assert.equal(lost, 1)
  assert.equal(prevented, true)
  detach()
  assert.equal(canvas.listeners['webglcontextlost'].length, 0)
})
