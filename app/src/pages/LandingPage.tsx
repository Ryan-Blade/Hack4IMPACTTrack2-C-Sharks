import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Zap, Activity, ArrowRight,
  TrendingUp, ShieldCheck, ChevronDown, Wifi, Battery,
  Building2, Leaf
} from 'lucide-react';
import {
  LiveBlockchainFeed,
  EnergyFlowDiagram,
  P2PNetworkVisualization,
} from '@/components/landing/TechVisualizations';
import { PulseBeamsProblemStatement } from '@/components/landing/PulseBeamsProblemStatement';
import { StepperHowItWorks } from '@/components/landing/StepperHowItWorks';
import { BounceCardsTechStack } from '@/components/landing/BounceCardsTechStack';
import { ArchitectureFlow } from '@/components/landing/ArchitectureFlow';
import { WebGLFooter } from '@/components/landing/WebGLFooter';
import { WebGLShader } from '@/components/ui/web-gl-shader';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import { Features } from '@/components/blocks/features-10';
// @ts-expect-error - JSX module without type declarations
import Particles from '@/components/Particles';

/* ─────────────────────────────────────────────
   Animated Canvas Background (Replaced by WebGLShader globally)
───────────────────────────────────────────── */

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
// Counter is now used inside StatCard below
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
   Feature Card (Replaced by external block)
───────────────────────────────────────────── */



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
  const [scrollY, setScrollY]         = useState(0);
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

  // Hero line stagger variants
  const heroContainer = {
    hidden: {},
    show: { transition: { staggerChildren: 0.18, delayChildren: 0.1 } },
  };
  const heroLine = {
    hidden: { opacity: 0, y: 30, skewY: 2 },
    show:   { opacity: 1, y: 0, skewY: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <div className="relative min-h-screen bg-zinc-950 text-white overflow-x-hidden">

      {/* ── Subtly glowing star/dust background pattern for non-WebGL areas ── */}
      <div 
        className="fixed inset-0 pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          zIndex: 0
        }}
      />
      <div 
        className="fixed inset-0 pointer-events-none opacity-40" 
        style={{
          backgroundImage: 'radial-gradient(circle at center, rgba(16,185,129,0.12) 1.5px, transparent 1.5px)',
          backgroundSize: '96px 96px',
          backgroundPosition: '24px 24px',
          zIndex: 0
        }}
      />

      {/* ── Particles floating in the background ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <Particles
          particleColors={["#10b981", "#34d399", "#ffffff"]}
          particleCount={60}
          particleSpread={10}
          speed={0.05}
          particleBaseSize={70}
          moveParticlesOnHover={false}
          alphaParticles={true}
          disableRotation={true}
        />
      </div>

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

      {/* ── Decorative floating ambient orbs visible in mid-page ── */}
      <div className="fixed top-[40vh] -left-32 w-80 h-80 bg-emerald-700/8 rounded-full blur-3xl pointer-events-none" style={{ zIndex: 0 }} />
      <div className="fixed top-[70vh] -right-32 w-96 h-96 bg-teal-700/6 rounded-full blur-3xl pointer-events-none" style={{ zIndex: 0 }} />
      <div className="fixed top-[120vh] left-1/3 w-64 h-64 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" style={{ zIndex: 0 }} />
      <div className="fixed top-[180vh] right-1/4 w-72 h-72 bg-green-800/6 rounded-full blur-3xl pointer-events-none" style={{ zIndex: 0 }} />

      {/* ── NAV ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ${
          scrollY > 60
            ? 'bg-zinc-950/80 backdrop-blur-2xl border-b border-white/5 shadow-xl shadow-zinc-950/30'
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
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden" style={{ zIndex: 1 }}>
        {/* Dynamic WebGL Background restricted to Hero Section */}
        <WebGLShader className="absolute inset-0 w-full h-full -z-10 pointer-events-none" />
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

        {/* Hero content — staggered framer-motion entrance */}
        <motion.div
          className="relative z-10 text-center max-w-5xl"
          variants={heroContainer}
          initial="hidden"
          animate={heroVisible ? 'show' : 'hidden'}
        >
          {/* Live badge */}
          <motion.div
            variants={heroLine}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/8 text-emerald-400 text-sm font-semibold mb-10 backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            Live AI-Powered Energy Trading — 50 Buildings Active
          </motion.div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-[1.05] tracking-tight overflow-hidden">
            <motion.span variants={heroLine} className="block text-white">Smart Energy</motion.span>
            <motion.span
              variants={heroLine}
              className="block bg-gradient-to-r from-emerald-400 via-green-300 to-teal-400 bg-clip-text text-transparent py-1"
            >
              Microgrid
            </motion.span>
            <motion.span variants={heroLine} className="block text-slate-300">for the Future</motion.span>
          </h1>

          <motion.p variants={heroLine} className="text-lg md:text-xl text-slate-400 mb-14 max-w-2xl mx-auto leading-relaxed font-light">
            50 AI-powered smart buildings trade energy peer-to-peer in real time.
            Watch your city breathe, adapt, and thrive — in stunning 3D.
          </motion.p>

          {/* Single scroll CTA */}
          <motion.button
            variants={heroLine}
            onClick={scrollToFeatures}
            whileHover={{ scale: 1.06, y: -2 }}
            whileTap={{ scale: 0.96 }}
            className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl
              border border-emerald-500/30 bg-emerald-500/8 text-emerald-300 font-semibold text-sm
              hover:border-emerald-500/60 hover:bg-emerald-500/15 hover:text-emerald-200
              transition-colors duration-300 backdrop-blur-md"
          >
            Discover how it works
            <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform animate-bounce" />
          </motion.button>
        </motion.div>

        {/* Scroll indicator mouse — clickable, positioned below all content */}
        <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 transition-all duration-1000 delay-700 ${heroVisible ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={scrollToFeatures}
            className="flex flex-col items-center gap-2 text-slate-500 hover:text-emerald-400 transition-colors duration-300 cursor-pointer group"
            aria-label="Scroll to explore"
          >
            <span className="text-[10px] tracking-[0.2em] uppercase font-medium group-hover:text-emerald-400 transition-colors">Scroll to explore</span>
            <div className="w-5 h-8 border border-slate-700 group-hover:border-emerald-500/50 rounded-full flex justify-center pt-1.5 transition-colors duration-300">
              <div className="w-0.5 h-2 bg-emerald-500 rounded-full animate-bounce" />
            </div>
          </button>
        </div>
      </section>

      {/* ── PROBLEM STATEMENT ── */}
      <section id="problem" className="relative py-24 px-6" style={{ zIndex: 1 }}>
        <Separator />
        <div className="max-w-6xl mx-auto mt-16">
          <SectionHeading tag="The Challenge" title="Why the Grid is Breaking" sub="Traditional energy systems weren't built for a decentralized world." />
          <div className="mt-12">
            <PulseBeamsProblemStatement />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section id="stats" className="relative py-20" style={{ zIndex: 1 }}>
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/20 via-transparent to-emerald-950/20 pointer-events-none" />
        <Separator />
        <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: 'Smart Buildings',  target: 50,   suffix: '',  icon: <Building2 className="w-8 h-8 text-emerald-400" /> },
            { label: 'P2P Trades Daily', target: 1200, suffix: '+', icon: <Zap className="w-8 h-8 text-amber-400" /> },
            { label: 'Grid Efficiency',  target: 94,   suffix: '%', icon: <TrendingUp className="w-8 h-8 text-blue-400" /> },
            { label: 'CO₂ Saved (kg/d)', target: 3400, suffix: '',  icon: <Leaf className="w-8 h-8 text-green-400" /> },
          ].map(({ label, target, suffix, icon }, i) => (
            <StatCard key={label} label={label} target={target} suffix={suffix} icon={icon} delay={i * 0.12} />
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
          <Features />
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="relative py-28 px-6" style={{ zIndex: 1 }}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto relative">
          <SectionHeading tag="Process" title="How It Works" sub="5 steps, from solar panel to blockchain." />
          <StepperHowItWorks />
        </div>
      </section>

      {/* ── TECH STACK ── */}
      <section id="tech-stack" className="relative py-24 px-6" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto relative z-10">
          <SectionHeading tag="Engine" title="Built with Production-Grade Tools" sub="We don't just simulate. We build on a battle-tested stack." />
          <BounceCardsTechStack />
        </div>
      </section>

      {/* ── ARCHITECTURE ── */}
      <section id="architecture" className="relative py-24 px-6" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto">
          <SectionHeading tag="Flow" title="How All the Pieces Connect" sub="A dynamic pipeline from physical sensors to blockchain settlement." />
          <ArchitectureFlow />
        </div>
      </section>

      {/* ── LIVE TECH IN ACTION ── */}
      <section id="live-tech" className="relative py-28 px-6" style={{ zIndex: 1 }}>
        <Separator />
        <div className="max-w-6xl mx-auto pt-16">
          <SectionHeading
            tag="Live Simulation"
            title={<>See the Tech <em className="not-italic text-white">in Action</em></>}
            sub="Watch real-time blockchain settlements, energy flows, and P2P trades — all animated live."
          />

          {/* Row 1: Blockchain Feed + Energy Flow */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-12">
            <LiveBlockchainFeed />
            <EnergyFlowDiagram />
          </div>

          {/* Row 2: Full-width P2P Network */}
          <div className="mt-6">
            <P2PNetworkVisualization />
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
      <section className="relative pt-36 pb-12 px-6 overflow-hidden" style={{ zIndex: 1 }}>
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
              <LiquidButton
                onClick={() => navigate('/intro')}
                className="text-white border border-emerald-500/30 rounded-full bg-emerald-500/10 backdrop-blur-md hover:scale-105 transition-all shadow-xl shadow-emerald-500/20"
                size={'xl'}
              >
                <Zap className="w-5 h-5 mr-3 text-emerald-400 group-hover:animate-bounce" />
                Launch EcoSync Dashboard
                <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
              </LiquidButton>
            </div>
      </section>

      {/* ── WEBGL FOOTER ── */}
      <WebGLFooter>
        <div className="flex items-center justify-center gap-6 text-emerald-500/80 text-sm flex-wrap">
          <span className="flex items-center gap-1.5">
            <TrendingUp  className="w-4 h-4 text-emerald-400" /> Real-time data
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Blockchain-settled
          </span>
          <span className="flex items-center gap-1.5">
            <Battery     className="w-4 h-4 text-emerald-400" /> 50 buildings live
          </span>
          <span className="flex items-center gap-1.5">
            <Wifi        className="w-4 h-4 text-emerald-400" /> WebSocket streaming
          </span>
        </div>
      </WebGLFooter>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section Heading helper — with framer-motion
───────────────────────────────────────────── */
function SectionHeading({ tag, title, sub }: { tag: string; title: React.ReactNode; sub: string }) {
  const { ref, inView } = useInView();
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className="text-center"
    >
      <motion.div
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/4 text-slate-400 text-xs font-semibold uppercase tracking-widest mb-5"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {tag}
      </motion.div>
      <h2 className="text-4xl md:text-5xl font-black mb-3 bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
        {title}
      </h2>
      {sub && <p className="text-slate-400 text-base max-w-xl mx-auto">{sub}</p>}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Stat Card — spring pop entrance with icon
───────────────────────────────────────────── */
function StatCard({
  label, target, suffix, icon, delay,
}: {
  label: string; target: number; suffix: string; icon: React.ReactNode; delay: number;
}) {
  const { ref, inView } = useInView();
  return (
    <motion.div
      ref={ref}
      className="space-y-2 group relative"
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay }}
      whileHover={{ y: -6, scale: 1.05 }}
    >
      <motion.div
        className="absolute -inset-4 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)' }}
      />
      <div className="mb-2 flex justify-center drop-shadow-lg">{icon}</div>
      <div className="text-4xl md:text-5xl font-black bg-gradient-to-b from-emerald-400 to-green-500 bg-clip-text text-transparent tabular-nums">
        <Counter target={target} suffix={suffix} />
      </div>
      <div className="text-slate-500 text-xs font-semibold uppercase tracking-widest">{label}</div>
    </motion.div>
  );
}
