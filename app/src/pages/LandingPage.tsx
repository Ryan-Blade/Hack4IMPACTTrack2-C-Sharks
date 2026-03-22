import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, Sun, Activity, ArrowRight, Cpu, Globe,
  TrendingUp, ShieldCheck, ChevronDown, Wifi, Battery
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Animated Canvas Background
   Draws a subtle flowing grid + drifting nodes
───────────────────────────────────────────── */
function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width  = window.innerWidth;
    let height = window.innerHeight;
    canvas.width  = width;
    canvas.height = height;

    const onResize = () => {
      width  = window.innerWidth;
      height = window.innerHeight;
      canvas.width  = width;
      canvas.height = height;
    };
    window.addEventListener('resize', onResize);

    // Node type
    interface Node { x: number; y: number; vx: number; vy: number; r: number; opacity: number }

    const COUNT   = 55;
    const CONNECT = 130;   // max distance to draw a line between nodes

    const nodes: Node[] = Array.from({ length: COUNT }, () => ({
      x:  Math.random() * width,
      y:  Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r:  1.5 + Math.random() * 1.5,
      opacity: 0.3 + Math.random() * 0.5,
    }));

    let t = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      t += 0.004;

      // Move nodes
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width)  n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      }

      // Draw connections
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const dx   = nodes[i].x - nodes[j].x;
          const dy   = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT) {
            const alpha = (1 - dist / CONNECT) * 0.12;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(16,185,129,${alpha})`;
            ctx.lineWidth   = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 2 + n.x * 0.01);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * (0.8 + 0.4 * pulse), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16,185,129,${n.opacity * pulse})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0, opacity: 0.6 }}
    />
  );
}

/* ─────────────────────────────────────────────
   useInView hook
───────────────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ─────────────────────────────────────────────
   Animated Counter
───────────────────────────────────────────── */
function Counter({ target, suffix = '', duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const { ref, inView }   = useInView();
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step  = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, duration]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ─────────────────────────────────────────────
   Feature Card
───────────────────────────────────────────── */
function FeatureCard({
  icon: Icon, title, desc, accent, delay,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string; desc: string; accent: string; delay: number;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`group relative flex flex-col gap-4 p-6 rounded-2xl
        border border-white/8 bg-slate-900/60 backdrop-blur-md
        hover:border-emerald-500/40 hover:bg-slate-800/60
        transition-all duration-700 cursor-default
        ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      {/* Subtle top-edge glow line */}
      <div
        className="absolute top-0 left-6 right-6 h-px rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
        style={{ background: `${accent}20`, border: `1px solid ${accent}40` }}
      >
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <div>
        <h3 className="text-base font-bold text-white mb-1.5">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Step Row
───────────────────────────────────────────── */
function StepRow({
  num, title, desc, accentGrad, isLeft, delay,
}: {
  num: string; title: string; desc: string; accentGrad: string; isLeft: boolean; delay: number;
}) {
  const { ref, inView } = useInView(0.2);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`flex items-center gap-6 md:gap-10 transition-all duration-700
        ${inView ? 'opacity-100 translate-x-0' : `opacity-0 ${isLeft ? '-translate-x-16' : 'translate-x-16'}`}
        ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
    >
      <div
        className={`flex-1 p-5 rounded-2xl border border-white/8 bg-slate-900/60 backdrop-blur-md
          hover:border-emerald-500/30 transition-colors duration-300 ${isLeft ? 'text-left' : 'text-right'}`}
      >
        <h3 className="text-lg font-bold text-white mb-1.5">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
      </div>
      {/* Step bubble */}
      <div
        className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center
          text-xl md:text-2xl font-black text-white shadow-xl shrink-0 ring-4 ring-white/8
          bg-gradient-to-br ${accentGrad}`}
      >
        {num}
      </div>
      <div className="flex-1 hidden md:block" />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Divider / section separator
───────────────────────────────────────────── */
function Separator() {
  return (
    <div className="max-w-6xl mx-auto px-6">
      <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN LANDING PAGE
───────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrollY, setScrollY]       = useState(0);
  const [heroVisible, setHeroVisible] = useState(false);
  const { ref: ctaRef, inView: ctaInView } = useInView(0.2);

  useEffect(() => {
    setTimeout(() => setHeroVisible(true), 120);
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToFeatures = useCallback(() => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="relative min-h-screen bg-slate-950 text-white overflow-x-hidden">

      {/* ── Persistent animated canvas background ── */}
      <AnimatedBackground />

      {/* ── Radial gradient overlay to give depth ── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(16,185,129,0.08) 0%, transparent 70%), ' +
            'radial-gradient(ellipse 60% 40% at 80% 80%, rgba(5,150,105,0.05) 0%, transparent 60%)',
          zIndex: 0,
        }}
      />

      {/* ── NAV ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ${
          scrollY > 60
            ? 'bg-slate-950/85 backdrop-blur-2xl border-b border-white/8 shadow-xl shadow-black/30'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 select-none">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Zap className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="absolute -inset-1.5 bg-emerald-500/15 rounded-xl blur-md" />
            </div>
            <span className="text-lg font-black bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent tracking-tight">
              EcoSync
            </span>
          </div>

          {/* Nav links only — no launch button */}
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400 font-medium">
            <a href="#features" className="hover:text-emerald-400 transition-colors duration-200">Features</a>
            <a href="#how"      className="hover:text-emerald-400 transition-colors duration-200">How It Works</a>
            <a href="#stats"    className="hover:text-emerald-400 transition-colors duration-200">Stats</a>
          </div>

          {/* Subtle scroll-down prompt instead of CTA */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <ChevronDown className="w-3.5 h-3.5 animate-bounce text-emerald-500" />
            Scroll to explore
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6" style={{ zIndex: 1 }}>
        {/* Static orbs for hero depth (layered behind canvas) */}
        <div className="absolute top-1/3 -left-48 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-48 w-[400px] h-[400px] bg-teal-600/8 rounded-full blur-3xl pointer-events-none"  />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(16,185,129,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.6) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
          }}
        />

        {/* Hero content */}
        <div
          className={`relative z-10 text-center max-w-5xl transition-all duration-1000 ease-out ${
            heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/8 text-emerald-400 text-sm font-semibold mb-10 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            Live AI-Powered Energy Trading — 50 Buildings Active
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-[1.05] tracking-tight">
            <span className="block text-white">Smart Energy</span>
            <span className="block bg-gradient-to-r from-emerald-400 via-green-300 to-teal-400 bg-clip-text text-transparent py-1">
              Microgrid
            </span>
            <span className="block text-slate-300">for the Future</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 mb-14 max-w-2xl mx-auto leading-relaxed font-light">
            50 AI-powered smart buildings trade energy peer-to-peer in real time.
            Watch your city breathe, adapt, and thrive — in stunning 3D.
          </p>

          {/* Single scroll CTA — no navigate button here */}
          <button
            onClick={scrollToFeatures}
            className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl
              border border-emerald-500/30 bg-emerald-500/8 text-emerald-300 font-semibold text-sm
              hover:border-emerald-500/60 hover:bg-emerald-500/15 hover:text-emerald-200
              transition-all duration-300 backdrop-blur-md"
          >
            Discover how it works
            <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform animate-bounce" />
          </button>
        </div>

        {/* Scroll indicator mouse */}
        <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 transition-all duration-1000 delay-700 ${heroVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex flex-col items-center gap-2 text-slate-600">
            <span className="text-[10px] tracking-[0.2em] uppercase font-medium">Scroll to explore</span>
            <div className="w-5 h-8 border border-slate-700 rounded-full flex justify-center pt-1.5">
              <div className="w-0.5 h-2 bg-emerald-500 rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section id="stats" className="relative py-20" style={{ zIndex: 1 }}>
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/20 via-transparent to-emerald-950/20 pointer-events-none" />
        <Separator />
        <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: 'Smart Buildings',   target: 50,   suffix: '' },
            { label: 'P2P Trades Daily',  target: 1200, suffix: '+' },
            { label: 'Grid Efficiency',   target: 94,   suffix: '%' },
            { label: 'CO₂ Saved (kg/d)',  target: 3400, suffix: '' },
          ].map(({ label, target, suffix }) => (
            <div key={label} className="space-y-2 group">
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-b from-emerald-400 to-green-500 bg-clip-text text-transparent tabular-nums">
                <Counter target={target} suffix={suffix} />
              </div>
              <div className="text-slate-500 text-xs font-semibold uppercase tracking-widest">{label}</div>
            </div>
          ))}
        </div>
        <Separator />
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="relative py-28 px-6" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            tag="Technology"
            title={<>Powered by <em className="not-italic text-white">Cutting-Edge</em> Tech</>}
            sub="Four pillars of the smartest energy grid ever simulated."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
            <FeatureCard icon={Sun}        title="Virtual IoT Layer"     accent="#f59e0b" delay={0}
              desc="50 simulated buildings with solar panels, batteries, and realistic load patterns updated every 5 s." />
            <FeatureCard icon={Cpu}        title="AI Trading Agents"     accent="#a855f7" delay={100}
              desc="Each building runs its own LangGraph AI agent that autonomously decides when to buy or sell energy." />
            <FeatureCard icon={Globe}      title="3D Digital Twin"       accent="#10b981" delay={200}
              desc="A live Three.js city that colour-codes every building's real-time energy state. Watch the grid breathe." />
            <FeatureCard icon={ShieldCheck} title="Blockchain Settlement" accent="#3b82f6" delay={300}
              desc="Every P2P trade is settled via EcoToken (ERC-20) smart contracts — transparent and tamper-proof." />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="relative py-28 px-6" style={{ zIndex: 1 }}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto relative">
          <SectionHeading tag="Process" title="How It Works" sub="Four steps, zero waste, infinite possibility." />
          <div className="space-y-10 mt-14">
            <StepRow num="1" isLeft accentGrad="from-emerald-500 to-green-600" delay={0}
              title="Buildings Sense & Simulate"
              desc="Each of the 50 virtual buildings continuously measures its solar generation, battery state-of-charge, and current load — publishing live data via MQTT every 5 seconds." />
            <StepRow num="2" isLeft={false} accentGrad="from-purple-500 to-violet-600" delay={100}
              title="AI Agents Decide"
              desc="A LangGraph AI agent analyses each building's state and negotiates P2P energy trades — buying from surplus neighbours, selling to those in need." />
            <StepRow num="3" isLeft accentGrad="from-blue-500 to-cyan-600" delay={200}
              title="FastAPI Bridges Everything"
              desc="The Python backend relays MQTT telemetry to the frontend over WebSocket in real time — keeping your 3D city perfectly in sync with the simulation." />
            <StepRow num="4" isLeft={false} accentGrad="from-amber-500 to-orange-600" delay={300}
              title="You See It All in 3D"
              desc="The React + Three.js dashboard renders every building's live status as a glowing colour in the city grid — green for selling, amber for buying, red for critical." />
          </div>
        </div>
      </section>

      {/* ── COLOUR LEGEND ── */}
      <section className="relative py-24 px-6" style={{ zIndex: 1 }}>
        <Separator />
        <div className="max-w-3xl mx-auto pt-16">
          <SectionHeading tag="Guide" title="Read the City at a Glance" sub="" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-10">
            {[
              { hex: '#22c55e', label: 'Selling Energy'    },
              { hex: '#f59e0b', label: 'Buying Energy'     },
              { hex: '#ef4444', label: 'Critical / Low'    },
              { hex: '#a855f7', label: 'Priority Building' },
              { hex: '#3b82f6', label: 'Balanced'          },
            ].map(({ hex, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-white/8 bg-slate-900/50 backdrop-blur-sm"
              >
                <div
                  className="w-9 h-9 rounded-full shadow-lg animate-pulse"
                  style={{ background: hex, boxShadow: `0 0 16px ${hex}60` }}
                />
                <span className="text-[11px] text-slate-400 text-center font-medium leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-16"><Separator /></div>
      </section>

      {/* ── FINAL CTA (only navigate button on the page) ── */}
      <section className="relative py-36 px-6 overflow-hidden" style={{ zIndex: 1 }}>
        {/* Glowing radial behind CTA */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] bg-emerald-500/8 rounded-full blur-2xl" />
        </div>

        <div
          ref={ctaRef}
          className={`relative z-10 max-w-3xl mx-auto text-center transition-all duration-1000 ease-out ${
            ctaInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          {/* Pre-heading */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 text-emerald-400 text-xs font-semibold mb-8 uppercase tracking-widest">
            <Activity className="w-3.5 h-3.5" />
                Live & Operational
              </div>

              <h2 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight">
                <span className="text-white">Ready to see</span>
                <br />
                <span className="bg-gradient-to-r from-emerald-400 via-green-300 to-teal-400 bg-clip-text text-transparent">
                  the future?
                </span>
              </h2>

              <p className="text-slate-400 text-lg mb-12 max-w-xl mx-auto leading-relaxed">
                Dive into the live 3D city, trigger grid events, and watch 50 AI agents
                balance the microgrid in real time.
              </p>

              {/* THE only navigate-to-dashboard button */}
              <button
                onClick={() => navigate('/dashboard')}
                className="group relative inline-flex items-center gap-3 px-10 py-5 rounded-2xl
                  bg-gradient-to-r from-emerald-500 to-green-500
                  text-white font-black text-xl
                  hover:from-emerald-400 hover:to-green-400
                  transition-all duration-300
                  shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-500/60
                  hover:scale-105 active:scale-95"
              >
                {/* Shimmer overlay */}
                <span
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background:
                      'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
                    backgroundSize: '200% 100%',
                  }}
                />
                <Zap className="w-6 h-6 group-hover:animate-bounce relative z-10" />
                <span className="relative z-10">Launch EcoSync Dashboard</span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform relative z-10" />
              </button>

              {/* Trust indicators */}
              <div className="mt-8 flex items-center justify-center gap-6 text-slate-500 text-sm flex-wrap">
                <span className="flex items-center gap-1.5">
                  <TrendingUp  className="w-3.5 h-3.5 text-emerald-500" /> Real-time data
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Blockchain-settled
                </span>
                <span className="flex items-center gap-1.5">
                  <Battery     className="w-3.5 h-3.5 text-emerald-500" /> 50 buildings live
                </span>
                <span className="flex items-center gap-1.5">
                  <Wifi        className="w-3.5 h-3.5 text-emerald-500" /> WebSocket streaming
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative border-t border-white/6 py-8 px-6" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-emerald-400 text-sm">EcoSync</span>
            <span className="text-slate-600 text-sm">— Smart City Energy Microgrid</span>
          </div>
          <span className="text-slate-700 text-xs">
            Built with ♥ for a sustainable future · MIT License
          </span>
        </div>
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section Heading helper
───────────────────────────────────────────── */
function SectionHeading({ tag, title, sub }: { tag: string; title: React.ReactNode; sub: string }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={`text-center transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
    >
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/4 text-slate-400 text-xs font-semibold uppercase tracking-widest mb-5">
        {tag}
      </div>
      <h2 className="text-4xl md:text-5xl font-black mb-3 bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
        {title}
      </h2>
      {sub && <p className="text-slate-400 text-base max-w-xl mx-auto">{sub}</p>}
    </div>
  );
}
