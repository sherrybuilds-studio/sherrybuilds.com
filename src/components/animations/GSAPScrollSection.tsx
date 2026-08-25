'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const slides = [
  {
    label: 'Concept',
    title: 'Designed for\nthe Bold',
    sub: 'Where architecture meets atmosphere.',
    bg: 'from-zinc-900 to-zinc-800',
    accent: '#c9a96e',
  },
  {
    label: 'Material',
    title: 'Raw Texture.\nPure Form.',
    sub: 'Every surface tells a story.',
    bg: 'from-stone-900 to-stone-700',
    accent: '#a8c5b5',
  },
  {
    label: 'Space',
    title: 'Light as a\nDesign Element',
    sub: 'Spaces that breathe with intention.',
    bg: 'from-neutral-900 to-neutral-700',
    accent: '#e8d5c0',
  },
]

export default function GSAPScrollSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const slidesRef = useRef<(HTMLDivElement | null)[]>([])
  const linesRef = useRef<(HTMLSpanElement | null)[][]>([[], [], []])

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Pin the scroll container
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: 'top top',
        end: `+=${slides.length * 100}%`,
        pin: true,
        pinSpacing: true,
      })

      slides.forEach((_, i) => {
        const slide = slidesRef.current[i]
        const lines = linesRef.current[i]
        if (!slide) return

        const progress = i / slides.length
        const nextProgress = (i + 1) / slides.length

        // Slide fade in
        if (i > 0) {
          gsap.fromTo(
            slide,
            { opacity: 0, y: 60 },
            {
              opacity: 1,
              y: 0,
              duration: 1,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: containerRef.current,
                start: `${progress * 100}% top`,
                end: `${progress * 100 + 15}% top`,
                scrub: 1,
              },
            }
          )
        }

        // Text lines stagger in
        lines.forEach((line, j) => {
          if (!line) return
          gsap.fromTo(
            line,
            { y: 80, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              ease: 'power4.out',
              scrollTrigger: {
                trigger: containerRef.current,
                start: `${progress * 100 + j * 3}% top`,
                end: `${progress * 100 + 10 + j * 3}% top`,
                scrub: 1,
              },
            }
          )
        })

        // Slide fade out (except last)
        if (i < slides.length - 1) {
          gsap.to(slide, {
            opacity: 0,
            y: -40,
            scrollTrigger: {
              trigger: containerRef.current,
              start: `${nextProgress * 100 - 10}% top`,
              end: `${nextProgress * 100}% top`,
              scrub: 1,
            },
          })
        }
      })
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: '100vh' }}
    >
      {slides.map((slide, i) => (
        <div
          key={i}
          ref={(el) => { slidesRef.current[i] = el }}
          className={`absolute inset-0 bg-gradient-to-br ${slide.bg} flex items-center justify-center px-16`}
          style={{ opacity: i === 0 ? 1 : 0 }}
        >
          {/* Accent line */}
          <div
            className="absolute left-16 top-1/2 -translate-y-1/2 w-px h-32"
            style={{ backgroundColor: slide.accent, opacity: 0.6 }}
          />

          <div className="max-w-4xl w-full pl-12">
            {/* Label */}
            <span
              ref={(el) => { linesRef.current[i][0] = el }}
              className="text-xs tracking-[0.4em] uppercase mb-8 block"
              style={{ color: slide.accent }}
            >
              {slide.label} — 0{i + 1}
            </span>

            {/* Title */}
            <h2
              ref={(el) => { linesRef.current[i][1] = el }}
              className="text-6xl md:text-8xl font-light text-white leading-none mb-8 whitespace-pre-line"
              style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.02em' }}
            >
              {slide.title}
            </h2>

            {/* Sub */}
            <p
              ref={(el) => { linesRef.current[i][2] = el }}
              className="text-lg text-white/50 max-w-md"
            >
              {slide.sub}
            </p>
          </div>

          {/* Slide number bottom right */}
          <div className="absolute bottom-12 right-16 text-white/20 text-xs tracking-widest">
            {String(i + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
          </div>
        </div>
      ))}

      {/* Scroll indicator */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30">
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <div className="w-px h-12 bg-white/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1/2 bg-white/60 animate-bounce" />
        </div>
      </div>
    </div>
  )
}
