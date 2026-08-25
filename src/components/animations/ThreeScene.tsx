'use client'

import { useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Float, MeshTransmissionMaterial, Text3D, Center } from '@react-three/drei'
import * as THREE from 'three'

function GlassOrb({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!meshRef.current) return
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.2
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.3
  })

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1.5}>
      <mesh ref={meshRef} position={position} scale={scale}>
        <icosahedronGeometry args={[1, 8]} />
        <MeshTransmissionMaterial
          backside
          samples={8}
          thickness={0.5}
          chromaticAberration={0.05}
          anisotropy={0.1}
          distortion={0.1}
          distortionScale={0.3}
          temporalDistortion={0.2}
          color="#ffffff"
          roughness={0}
          transmission={1}
        />
      </mesh>
    </Float>
  )
}

function Ring({ radius, speed, color }: { radius: number; speed: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.x = state.clock.elapsedTime * speed * 0.4
    ref.current.rotation.z = state.clock.elapsedTime * speed * 0.2
  })

  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, 0.015, 16, 120]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
    </mesh>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
      <pointLight position={[-10, -5, -5]} intensity={0.5} color="#c9a96e" />
      <pointLight position={[0, 0, 5]} intensity={0.3} color="#a8c5b5" />

      {/* Main glass orb */}
      <GlassOrb position={[0, 0, 0]} scale={1.4} />

      {/* Orbiting rings */}
      <Ring radius={2.5} speed={0.6} color="#c9a96e" />
      <Ring radius={3.2} speed={-0.4} color="#a8c5b5" />
      <Ring radius={3.9} speed={0.3} color="#e8d5c0" />

      {/* Satellite orbs */}
      <GlassOrb position={[3.5, 1, -1]} scale={0.35} />
      <GlassOrb position={[-3, -1.5, 0.5]} scale={0.25} />
      <GlassOrb position={[1, 2.8, -2]} scale={0.2} />

      <Environment preset="studio" />
    </>
  )
}

export default function ThreeScene() {
  return (
    <div className="relative w-full h-screen bg-black flex items-center justify-center">
      {/* Text overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
        <p className="text-xs tracking-[0.5em] uppercase text-white/30 mb-6">
          WebGL — Interactive
        </p>
        <h2
          className="text-5xl md:text-7xl font-light text-white text-center leading-tight"
          style={{ fontFamily: 'Georgia, serif', mixBlendMode: 'difference' }}
        >
          Space is<br />
          <em className="not-italic" style={{ color: '#c9a96e' }}>everything</em>
        </h2>
        <p className="text-white/30 text-sm mt-8 tracking-widest uppercase">
          Drag to explore
        </p>
      </div>

      {/* Three.js canvas */}
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [0, 0, 8], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
        >
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      </div>
    </div>
  )
}
