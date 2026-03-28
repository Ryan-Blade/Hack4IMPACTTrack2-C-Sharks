import { useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { Sun, BrainCircuit, Handshake, Link2, BarChart3 } from 'lucide-react';

const steps = [
  { num: '01', title: "Buildings Generate Solar", desc: "Each building has rooftop solar panels tracked by IoT sensors. Production, consumption, and battery level update every 15 minutes.", icon: Sun, accent: '#10b981' },
  { num: '02', title: "AI Predicts What's Coming", desc: "Our LSTM neural network predicts the next hour's energy state for every building with 95% accuracy — before the surplus or deficit even happens.", icon: BrainCircuit, accent: '#6366f1' },
  { num: '03', title: "AI Agents Negotiate Trades", desc: "Every building has its own AI agent (LangGraph). When Agent A sees surplus and Agent B runs short, they negotiate a peer-to-peer trade automatically.", icon: Handshake, accent: '#06b6d4' },
  { num: '04', title: "Blockchain Seals the Deal", desc: "The agreed trade is written to a Polygon blockchain smart contract. Payment is automatic, transparent, and permanent.", icon: Link2, accent: '#a855f7' },
  { num: '05', title: "Live Dashboard Shows Everything", desc: "Every trade, prediction, and grid balance is visible in real time. Full transparency — from rooftop panel to blockchain transaction.", icon: BarChart3, accent: '#f59e0b' },
];

export function StepperHowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start 0.8', 'end 0.4'] });
  const lineHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <div ref={containerRef} className="relative max-w-3xl mx-auto mt-14 space-y-10 pl-4 md:pl-0">
      {/* Animated growing line */}
      <div className="absolute left-[31px] md:left-[39px] top-10 bottom-10 w-[2px] bg-slate-800 overflow-hidden rounded-full">
        <motion.div
          className="w-full bg-gradient-to-b from-emerald-400 via-indigo-400 to-amber-400 rounded-full"
          style={{ height: lineHeight }}
        />
      </div>

      {steps.map((step, idx) => (
        <StepItem key={step.num} step={step} idx={idx} />
      ))}
    </div>
  );
}

function StepItem({ step, idx }: { step: typeof steps[0]; idx: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: idx % 2 === 0 ? -40 : 40 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay: idx * 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-center"
    >
      {/* Step bubble with pulsing ring */}
      <div className="relative flex-shrink-0 z-10">
        {/* Outer animated ring */}
        {inView && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: `2px solid ${step.accent}` }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: idx * 0.3 }}
          />
        )}
        <motion.div
          className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-900 flex items-center justify-center shadow-2xl"
          style={{ border: `2px solid ${step.accent}`, boxShadow: `0 0 24px ${step.accent}40` }}
          whileHover={{ scale: 1.12, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          <span className="flex items-center justify-center drop-shadow-md text-white/90">
            <step.icon className="w-8 h-8 md:w-10 md:h-10" />
          </span>
        </motion.div>
      </div>

      {/* Card */}
      <motion.div
        className="relative bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 border border-white/8 flex-1 overflow-hidden group"
        whileHover={{ y: -4, borderColor: `${step.accent}50` }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* Shimmer sweep on hover */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `linear-gradient(105deg, transparent 40%, ${step.accent}12 50%, transparent 60%)`,
          }}
        />
        <div className="flex items-center gap-3 mb-2">
          <span
            className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ color: step.accent, background: `${step.accent}18`, border: `1px solid ${step.accent}30` }}
          >
            Step {step.num}
          </span>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
        <p className="text-slate-400 leading-relaxed text-sm">{step.desc}</p>
      </motion.div>
    </motion.div>
  );
}
