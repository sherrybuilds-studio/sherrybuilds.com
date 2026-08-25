'use client'

import dynamic from 'next/dynamic'
import LenisProvider from '@/components/providers/LenisProvider'

// Dynamic imports — Three.js and GSAP must be client-side only
const GSAPScrollSection = dynamic(
  () => import('@/components/animations/GSAPScrollSection'),
  { ssr: false }
)

const ThreeScene = dynamic(
  () => import('@/components/animations/ThreeScene'),
  { ssr: false }
)

export default function DemoPage() {
  return (
    <LenisProvider>
      <main className="bg-black text-white overflow-x-hidden">

        {/* Hero */}
        <section className="h-screen flex flex-col items-center justify-center relative">
          <div className="text-center z-10">
            <p className="text-xs tracking-[0.5em] uppercase text-white/30 mb-6">
              SherryBuilds OS — Animation Stack
            </p>
            <h1
              className="text-7xl md:text-9xl font-light leading-none mb-8"
              style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.03em' }}
            >
              Motion.<br />
              <span style={{ color: '#c9a96e' }}>Form.</span>
            </h1>
            <p className="text-white/40 text-lg tracking-wide">
              GSAP + Three.js + WebGL + Lenis
            </p>
          </div>

          {/* Decorative grid lines */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-1/2 left-0 w-full h-px bg-white" />
            <div className="absolute top-0 left-1/2 w-px h-full bg-white" />
          </div>

          {/* Scroll hint */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
            <span className="text-white/20 text-xs tracking-[0.4em] uppercase">Scroll Down</span>
            <div className="w-px h-16 bg-gradient-to-b from-white/30 to-transparent" />
          </div>
        </section>

        {/* GSAP Scroll Section — pinned scroll storytelling */}
        <div style={{ height: `${3 * 100}vh` }}>
          <GSAPScrollSection />
        </div>

        {/* Three.js WebGL Scene */}
        <ThreeScene />

        {/* Footer */}
        <section className="h-screen flex items-center justify-center bg-zinc-950">
          <div className="text-center">
            <p className="text-xs tracking-[0.5em] uppercase text-white/20 mb-4">Stack</p>
            <div className="flex gap-8 text-white/40 text-sm tracking-widest uppercase">
              <span>GSAP</span>
              <span className="text-white/10">·</span>
              <span>Three.js</span>
              <span className="text-white/10">·</span>
              <span>WebGL</span>
              <span className="text-white/10">·</span>
              <span>Lenis</span>
            </div>
          </div>
        </section>

      </main>
    </LenisProvider>
  )
}
