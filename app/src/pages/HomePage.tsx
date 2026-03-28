import { useEffect, useRef, useState, useCallback } from 'react'
import { useEcoStore } from '@/store/useEcoStore'

/* ═══════════════════════════════════════════════════════
   PARTICLE CANVAS BACKGROUND
   ═══════════════════════════════════════════════════════ */
function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = window.innerWidth, h = window.innerHeight
    canvas.width = w; canvas.height = h

    const onResize = () => { w = window.innerWidth; h = window.innerHeight; canvas.width = w; canvas.height = h }
    window.addEventListener('resize', onResize)

    interface P { x: number; y: number; vx: number; vy: number; r: number; o: number }
    const COUNT = 150
    const CONN = 120
    const ps: P[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: 1 + Math.random() * 1.5, o: 0.2 + Math.random() * 0.4,
    }))

    let raf = 0
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      for (const p of ps) {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
      }
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const dx = ps[i].x - ps[j].x, dy = ps[i].y - ps[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < CONN) {
            ctx.beginPath(); ctx.moveTo(ps[i].x, ps[i].y); ctx.lineTo(ps[j].x, ps[j].y)
            ctx.strokeStyle = `rgba(0,212,255,${(1 - d / CONN) * 0.08})`
            ctx.lineWidth = 0.6; ctx.stroke()
          }
        }
      }
      for (const p of ps) {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,245,160,${p.o})`; ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, opacity: 0.7 }} />
}

/* ═══════════════════════════════════════════════════════
   MINI 3D PREVIEW (Canvas 2D animated — lightweight)
   ═══════════════════════════════════════════════════════ */
function MiniPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = 500, H = 400
    canvas.width = W; canvas.height = H

    const buildings = [
      { x: 160, y: 260, w: 45, h: 100, color: '#00F5A0' },
      { x: 250, y: 240, w: 50, h: 120, color: '#00D4FF' },
      { x: 340, y: 270, w: 40, h: 90, color: '#7C6BFF' },
      { x: 120, y: 290, w: 35, h: 70, color: '#FFD700' },
      { x: 380, y: 280, w: 42, h: 80, color: '#FF6B6B' },
    ]

    let t = 0, raf = 0
    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // Grid floor
      ctx.strokeStyle = 'rgba(0,212,255,0.1)'
      ctx.lineWidth = 0.5
      for (let i = 0; i < W; i += 30) {
        ctx.beginPath(); ctx.moveTo(i, 200); ctx.lineTo(i, H); ctx.stroke()
      }
      for (let j = 200; j < H; j += 20) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(W, j); ctx.stroke()
      }

      // Buildings
      for (const b of buildings) {
        const pulse = Math.sin(t * 2 + b.x * 0.01) * 0.15 + 0.85
        const grad = ctx.createLinearGradient(b.x, b.y - b.h, b.x, b.y)
        grad.addColorStop(0, b.color + 'CC')
        grad.addColorStop(1, b.color + '33')
        ctx.fillStyle = grad
        ctx.fillRect(b.x - b.w / 2, b.y - b.h * pulse, b.w, b.h * pulse)

        // Glow on top
        ctx.shadowColor = b.color; ctx.shadowBlur = 12
        ctx.fillStyle = b.color
        ctx.fillRect(b.x - b.w / 2 + 4, b.y - b.h * pulse, b.w - 8, 3)
        ctx.shadowBlur = 0

        // Windows
        ctx.fillStyle = b.color + '88'
        for (let wy = b.y - b.h * pulse + 10; wy < b.y - 10; wy += 14) {
          for (let wx = b.x - b.w / 2 + 6; wx < b.x + b.w / 2 - 6; wx += 10) {
            ctx.fillRect(wx, wy, 5, 8)
          }
        }
      }

      // Energy lines between buildings
      for (let i = 0; i < buildings.length - 1; i++) {
        const a = buildings[i], b = buildings[i + 1]
        const progress = (Math.sin(t * 1.5 + i) + 1) / 2
        const mx = a.x + (b.x - a.x) * progress
        const my = a.y - a.h / 2 + (b.y - b.h / 2 - (a.y - a.h / 2)) * progress

        ctx.beginPath()
        ctx.moveTo(a.x, a.y - a.h / 2)
        ctx.lineTo(b.x, b.y - b.h / 2)
        ctx.strokeStyle = 'rgba(0,245,160,0.15)'; ctx.lineWidth = 1; ctx.stroke()

        ctx.beginPath(); ctx.arc(mx, my, 3, 0, Math.PI * 2)
        ctx.fillStyle = '#00F5A0'; ctx.fill()
        ctx.shadowColor = '#00F5A0'; ctx.shadowBlur = 8
        ctx.fill(); ctx.shadowBlur = 0
      }

      t += 0.016
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div style={{ position: 'relative' }}>
      <canvas ref={canvasRef} style={{ width: '100%', maxWidth: 500, height: 'auto', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }} />
      <div style={{
        position: 'absolute', top: 12, right: 12,
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 20,
        background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
        fontFamily: 'Inter,sans-serif', fontSize: 9,
        color: '#FF6B6B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6B6B', animation: 'hpPulse 1.5s infinite' }} />
        LIVE
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════════════════════ */
function Counter({ target, suffix = '', color }: { target: number; suffix?: string; color: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.3 })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    let v = 0
    const step = Math.ceil(target / 60)
    const id = setInterval(() => {
      v += step
      if (v >= target) { setCount(target); clearInterval(id) }
      else setCount(v)
    }, 16)
    return () => clearInterval(id)
  }, [visible, target])

  return (
    <div ref={ref} style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 48, fontWeight: 700, color, lineHeight: 1 }}>
        {count}{suffix}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   REVEAL ON SCROLL
   ═══════════════════════════════════════════════════════ */
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true) }, { threshold: 0.15 })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(30px)',
      transition: `all 0.7s ease ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   TECH MARQUEE
   ═══════════════════════════════════════════════════════ */
function TechMarquee() {
  const techs = [
    { name: 'React', c: '#61DAFB' }, { name: 'Three.js', c: '#00F5A0' },
    { name: 'TensorFlow', c: '#FF6F00' }, { name: 'LangGraph', c: '#7C6BFF' },
    { name: 'Solidity', c: '#363636' }, { name: 'Polygon', c: '#8247E5' },
    { name: 'FastAPI', c: '#009688' }, { name: 'MQTT', c: '#660066' },
    { name: 'OpenWeatherMap', c: '#EB6E4B' }, { name: 'Cesium Ion', c: '#6CAAEB' },
    { name: 'PostgreSQL', c: '#336791' }, { name: 'Redis', c: '#DC382D' },
    { name: 'Vercel', c: '#ffffff' }, { name: 'Railway', c: '#0B0D0E' },
  ]
  const doubled = [...techs, ...techs]

  return (
    <div style={{ overflow: 'hidden', width: '100%', padding: '20px 0' }}>
      <div style={{
        display: 'flex', gap: 16, width: 'max-content',
        animation: 'hpMarquee 30s linear infinite',
      }}>
        {doubled.map((t, i) => (
          <span key={i} style={{
            padding: '8px 18px', borderRadius: 30,
            border: `1px solid ${t.c}33`, background: `${t.c}0A`,
            fontFamily: 'Inter,sans-serif', fontSize: 12,
            color: t.c === '#363636' || t.c === '#0B0D0E' ? '#aaa' : t.c,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {t.name}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   HOMEPAGE
   ═══════════════════════════════════════════════════════ */
export default function HomePage() {
  const setAppMode = useEcoStore((s) => s.setAppMode)
  const [heroVis, setHeroVis] = useState(false)
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setTimeout(() => setHeroVis(true), 100) }, [])

  const goGlobe = useCallback(() => {
    setAppMode('globe')
  }, [setAppMode])

  const scrollToCta = useCallback(() => {
    ctaRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Shared styles
  const mono = 'Inter,sans-serif'
  const syne = 'Syne,sans-serif'

  return (
    <div style={{
      width: '100vw', height: '100vh', overflowY: 'auto', overflowX: 'hidden',
      background: '#060D1A', color: '#fff', scrollBehavior: 'smooth',
    }}>
      <ParticleBackground />

      {/* ─── SECTION 1: HERO ─── */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        padding: '80px 60px', position: 'relative', zIndex: 1,
        gap: 60, flexWrap: 'wrap',
      }}>
        {/* Left */}
        <div style={{ flex: '1 1 480px', maxWidth: 600 }}>
          <div style={{
            opacity: heroVis ? 1 : 0, transform: heroVis ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s ease 0.1s',
          }}>
            <div style={{
              fontFamily: mono, fontSize: 11, color: '#00D4FF',
              letterSpacing: '0.2em', marginBottom: 20, textTransform: 'uppercase',
            }}>
              HACKOLYMPUS 2026 — Track 2
            </div>
          </div>

          <div style={{
            opacity: heroVis ? 1 : 0, transform: heroVis ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s ease 0.2s',
          }}>
            <h1 style={{
              fontFamily: syne, fontSize: 80, fontWeight: 900, lineHeight: 0.95, margin: '0 0 16px',
              background: 'linear-gradient(135deg, #00F5A0 0%, #00D4FF 50%, #7C6BFF 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              EcoSync
            </h1>
          </div>

          <div style={{
            opacity: heroVis ? 1 : 0, transform: heroVis ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s ease 0.3s',
          }}>
            <h2 style={{
              fontFamily: syne, fontSize: 28, fontWeight: 400,
              color: 'rgba(255,255,255,0.7)', margin: '0 0 24px', lineHeight: 1.3,
            }}>
              AI-Driven Decentralized<br />Microgrid Orchestrator
            </h2>
          </div>

          <div style={{
            opacity: heroVis ? 1 : 0, transform: heroVis ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s ease 0.4s',
          }}>
            <p style={{
              fontFamily: mono, fontSize: 14, color: 'rgba(255,255,255,0.45)',
              lineHeight: 1.8, maxWidth: 480, margin: '0 0 24px',
            }}>
              Every building becomes a smart node that predicts its own energy needs
              and trades surplus power with neighbors — like an Airbnb for electricity.
            </p>
          </div>

          <div style={{
            opacity: heroVis ? 1 : 0, transform: heroVis ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s ease 0.5s',
          }}>
            <div style={{
              display: 'inline-flex', padding: '6px 14px', borderRadius: 30,
              border: '1px solid rgba(0,212,255,0.3)', marginBottom: 40,
              fontFamily: mono, fontSize: 11, color: 'rgba(255,255,255,0.5)',
            }}>
              Team C-Sharks · KIIT DU
            </div>
          </div>

          <div style={{
            opacity: heroVis ? 1 : 0, transform: heroVis ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s ease 0.6s', display: 'flex', gap: 16, flexWrap: 'wrap',
          }}>
            <button onClick={scrollToCta} style={{
              background: 'linear-gradient(135deg, #00F5A0, #00D4FF)',
              border: 'none', borderRadius: 30, padding: '14px 32px',
              fontFamily: syne, fontSize: 15, fontWeight: 700,
              color: '#060D1A', cursor: 'pointer',
              boxShadow: '0 0 30px rgba(0,245,160,0.25)',
              transition: 'transform 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              🌍 Launch Global Simulator
            </button>
            <button style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: 30,
              padding: '14px 28px', fontFamily: mono, fontSize: 13,
              color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
            >
              📄 Read Whitepaper
            </button>
          </div>
        </div>

        {/* Right — Mini preview */}
        <div style={{
          flex: '1 1 400px', display: 'flex', justifyContent: 'center',
          opacity: heroVis ? 1 : 0, transform: heroVis ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 1s ease 0.5s',
        }}>
          <MiniPreview />
        </div>
      </section>

      {/* ─── SECTION 2: STATS BAR ─── */}
      <section style={{
        background: 'rgba(0,212,255,0.04)',
        borderTop: '1px solid rgba(0,212,255,0.1)',
        borderBottom: '1px solid rgba(0,212,255,0.1)',
        padding: '40px 60px', position: 'relative', zIndex: 1,
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 32, maxWidth: 1000, margin: '0 auto', textAlign: 'center',
        }}>
          {[
            { target: 30, suffix: '%', label: 'Energy Waste Reduced', color: '#00F5A0' },
            { target: 15, suffix: '%', label: 'Cheaper Bills', color: '#00D4FF' },
            { target: 100, suffix: '%', label: 'Critical Uptime', color: '#FFD700' },
            { target: 95, suffix: '%', label: 'AI Accuracy', color: '#7C6BFF' },
          ].map((s) => (
            <div key={s.label}>
              <Counter target={s.target} suffix={s.suffix} color={s.color} />
              <div style={{
                fontFamily: mono, fontSize: 10, textTransform: 'uppercase',
                letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', marginTop: 10,
              }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── SECTION 3: HOW IT WORKS ─── */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '80px 60px',
        position: 'relative', zIndex: 1,
      }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontFamily: syne, fontSize: 44, fontWeight: 800, margin: '0 0 12px',
              background: 'linear-gradient(135deg, #00F5A0, #00D4FF)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>How EcoSync Works</h2>
            <p style={{ fontFamily: mono, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              Four layers of intelligence, working in perfect harmony
            </p>
          </div>
        </Reveal>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24, maxWidth: 1100, margin: '0 auto', width: '100%',
        }}>
          {[
            { icon: '🏙️', title: 'Digital Twin', accent: '#00F5A0',
              desc: 'NVIDIA Isaac Sim creates a virtual neighborhood. Every building has a solar panel, battery, and consumption profile. Real physics. Real data.' },
            { icon: '🧠', title: 'Predictive AI', accent: '#00D4FF',
              desc: 'LSTM neural networks analyze 3 hours of energy data and predict the next hour with 95% accuracy. Buildings know their future before it happens.' },
            { icon: '🤝', title: 'P2P Trading', accent: '#7C6BFF',
              desc: 'LangGraph agents negotiate energy trades autonomously. Buildings with surplus sell to buildings with deficit — no utility company in the middle.' },
            { icon: '⛓', title: 'Blockchain Settlement', accent: '#FFD700',
              desc: 'Every trade is settled on Polygon Mumbai testnet. Immutable. Transparent. Trustless. Like Airbnb for electricity.' },
          ].map((card, i) => (
            <Reveal key={card.title} delay={i * 100}>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16,
                padding: 32, cursor: 'default',
                transition: 'border-color 0.3s, background 0.3s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = card.accent + '66'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              >
                <div style={{ fontSize: 32, marginBottom: 16 }}>{card.icon}</div>
                <h3 style={{ fontFamily: syne, fontSize: 20, fontWeight: 700, margin: '0 0 12px', color: card.accent }}>
                  {card.title}
                </h3>
                <p style={{ fontFamily: mono, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: 0 }}>
                  {card.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── SECTION 4: TECH STACK ─── */}
      <section style={{ padding: '60px 0', position: 'relative', zIndex: 1 }}>
        <Reveal>
          <h2 style={{
            fontFamily: syne, fontSize: 36, fontWeight: 800, textAlign: 'center',
            marginBottom: 24, color: 'rgba(255,255,255,0.8)',
          }}>Built With</h2>
        </Reveal>
        <TechMarquee />
      </section>

      {/* ─── SECTION 5: TEAM ─── */}
      <section style={{
        padding: '80px 60px', position: 'relative', zIndex: 1,
      }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontFamily: syne, fontSize: 40, fontWeight: 800, margin: '0 0 8px',
              background: 'linear-gradient(135deg,#00F5A0,#00D4FF)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Team C-Sharks</h2>
            <p style={{ fontFamily: mono, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              KIIT DU · HACKOLYMPUS 2026 · Track 2
            </p>
          </div>
        </Reveal>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 24, maxWidth: 900, margin: '0 auto',
        }}>
          {[
            { initial: 'H', name: 'Harshit', role: 'Frontend & Simulation', tech: 'React · Three.js · CesiumJS · R3F', color: '#00D4FF' },
            { initial: 'S', name: 'Siddhartha', role: 'Backend & Blockchain', tech: 'FastAPI · Solidity · MQTT · Polygon', color: '#00F5A0' },
            { initial: 'P', name: 'Priti', role: 'AI/ML & Frontend Polish', tech: 'TensorFlow · LangGraph', color: '#7C6BFF' },
            { initial: 'P', name: 'Priyadarshini Pal', role: 'PPT · Frontend · Intro & Supervision', tech: 'Presentation · UI Design · Project Lead', color: '#FF6B9D' },
          ].map((m, i) => (
            <Reveal key={m.name} delay={i * 100}>
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16, padding: 28, textAlign: 'center',
                transition: 'border-color 0.3s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = m.color + '66'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: m.color + '22', border: `2px solid ${m.color}66`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: syne, fontSize: 24, fontWeight: 800, color: m.color,
                  margin: '0 auto 16px',
                }}>
                  {m.initial}
                </div>
                <div style={{ fontFamily: syne, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{m.name}</div>
                <div style={{ fontFamily: mono, fontSize: 11, color: m.color, marginBottom: 12 }}>{m.role}</div>
                <div style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{m.tech}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── SECTION 6: CTA ─── */}
      <section ref={ctaRef} style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px 40px', position: 'relative', zIndex: 1, textAlign: 'center',
      }}>
        {/* Decorative bg text */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          fontFamily: syne, fontSize: 200, fontWeight: 900,
          color: 'rgba(255,255,255,0.015)', whiteSpace: 'nowrap',
          pointerEvents: 'none', userSelect: 'none',
        }}>
          ECOSYNC
        </div>

        <Reveal>
          <h2 style={{
            fontFamily: syne, fontSize: 56, fontWeight: 900,
            lineHeight: 1.1, margin: '0 0 24px',
            background: 'linear-gradient(135deg, #00F5A0 0%, #00D4FF 50%, #7C6BFF 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Ready to see the future<br />of energy?
          </h2>
        </Reveal>

        <Reveal delay={100}>
          <p style={{
            fontFamily: mono, fontSize: 14, color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.8, maxWidth: 520, margin: '0 auto 48px',
          }}>
            Enter any pincode. Watch 50 buildings come alive.
            Toggle sources. See the AI redistribute power in real-time.
            Verify every trade on blockchain.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <button onClick={goGlobe} style={{
            background: 'linear-gradient(135deg, #00F5A0, #00D4FF)',
            border: 'none', borderRadius: 50, padding: '20px 60px',
            fontFamily: syne, fontSize: 18, fontWeight: 800,
            color: '#060D1A', cursor: 'pointer',
            boxShadow: '0 0 60px rgba(0,245,160,0.3)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 0 80px rgba(0,245,160,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(0,245,160,0.3)' }}
          >
            🌍 View Global Dashboard →
          </button>
        </Reveal>

        <Reveal delay={300}>
          <p style={{
            fontFamily: mono, fontSize: 11, color: 'rgba(255,255,255,0.25)',
            marginTop: 24,
          }}>
            No login required · 100% browser-based · Works on any device
          </p>
        </Reveal>

        {/* Footer */}
        <div style={{
          position: 'absolute', bottom: 30, left: 0, right: 0,
          textAlign: 'center', fontFamily: mono, fontSize: 10,
          color: 'rgba(255,255,255,0.2)',
        }}>
          EcoSync · Team C-Sharks · KIIT DU · HACKOLYMPUS 2026<br />
          Built with ⚡ in 72 hours
        </div>
      </section>

      {/* ─── KEYFRAMES ─── */}
      <style>{`
        @keyframes hpPulse {
          0%, 100% { opacity:1; }
          50% { opacity:0.4; }
        }
        @keyframes hpMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        * { scrollbar-width: thin; scrollbar-color: rgba(0,212,255,0.2) transparent; }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(0,212,255,0.2); border-radius:3px; }
      `}</style>
    </div>
  )
}
