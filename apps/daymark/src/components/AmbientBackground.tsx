import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'

/**
 * Cinematic ambient field — Pattern Monster–style SVG mesh + a lightweight
 * Casberry/OriginKit–inspired particle drift. Pure CSS/canvas, no Three.js.
 * Respects prefers-reduced-motion.
 */

const PARTICLE_COUNT = 36

export function AmbientBackground() {
  const reduce = useReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (reduce) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let w = 0
    let h = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    type P = { x: number; y: number; r: number; vx: number; vy: number; a: number }
    let particles: P[] = []

    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 1.8,
        vx: (Math.random() - 0.5) * 0.18,
        vy: -0.05 - Math.random() * 0.22,
        a: 0.18 + Math.random() * 0.45,
      }))
    }

    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.y < -8) {
          p.y = h + 8
          p.x = Math.random() * w
        }
        if (p.x < -8) p.x = w + 8
        if (p.x > w + 8) p.x = -8
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4)
        g.addColorStop(0, `rgba(224, 180, 255, ${p.a})`)
        g.addColorStop(0.45, `rgba(139, 109, 255, ${p.a * 0.35})`)
        g.addColorStop(1, 'rgba(139, 109, 255, 0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(tick)
    }

    resize()
    tick()
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [reduce])

  return (
    <div className="ambient" aria-hidden>
      <div className="ambient-aurora" />
      <div className="ambient-pattern" />
      {!reduce ? <canvas ref={canvasRef} className="ambient-particles" /> : null}
      {/* Soft drifting orbs — OriginKit-style ambient blobs */}
      {!reduce ? (
        <>
          <motion.div
            className="ambient-blob blob-a"
            animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="ambient-blob blob-b"
            animate={{ x: [0, -50, 30, 0], y: [0, 40, -25, 0] }}
            transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      ) : null}
    </div>
  )
}
