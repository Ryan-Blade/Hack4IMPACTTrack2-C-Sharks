import { useRef, useState } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { BrainCircuit, Bot, Link2, Zap, Building2, Globe } from 'lucide-react';

const tech = [
  { name: 'TensorFlow LSTM', desc: 'Energy prediction AI', color: 'bg-orange-500/10 border-orange-500/30', glow: '#f97316', icon: BrainCircuit, stat: '95%', statLabel: 'accuracy' },
  { name: 'LangGraph', desc: 'Multi-agent negotiation', color: 'bg-blue-500/10 border-blue-500/30', glow: '#3b82f6', icon: Bot, stat: '50', statLabel: 'agents live' },
  { name: 'Polygon Blockchain', desc: 'Smart contract trades', color: 'bg-purple-500/10 border-purple-500/30', glow: '#a855f7', icon: Link2, stat: '1.2K', statLabel: 'trades/day' },
  { name: 'FastAPI', desc: 'Real-time Python backend', color: 'bg-emerald-500/10 border-emerald-500/30', glow: '#10b981', icon: Zap, stat: '<10ms', statLabel: 'latency' },
  { name: 'Smart Building Edge', desc: 'IoT telemetry & control', color: 'bg-green-500/10 border-green-500/30', glow: '#22c55e', icon: Building2, stat: '50', statLabel: 'buildings' },
  { name: 'React + Three.js', desc: '3D monitoring dashboard', color: 'bg-cyan-500/10 border-cyan-500/30', glow: '#06b6d4', icon: Globe, stat: '60fps', statLabel: 'render' },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.92, rotateX: 12 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 22 },
  },
};

export function BounceCardsTechStack() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto mt-14"
      style={{ perspective: '800px' }}
    >
      {tech.map((item) => (
        <TechCard key={item.name} item={item} />
      ))}
    </motion.div>
  );
}

function TechCard({ item }: { item: typeof tech[0] }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -10, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={`relative p-6 rounded-3xl ${item.color} border backdrop-blur-md overflow-hidden cursor-default group`}
      style={{
        boxShadow: hovered ? `0 20px 60px -10px ${item.glow}50` : `0 4px 20px -4px ${item.glow}20`,
        transition: 'box-shadow 0.3s ease',
      }}
    >
      {/* Radial glow that follows hover */}
      <motion.div
        className="absolute inset-0 rounded-3xl pointer-events-none"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: `radial-gradient(circle at 50% 0%, ${item.glow}25 0%, transparent 65%)`,
        }}
      />

      {/* Shimmer sweep */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ x: '-100%', opacity: 0 }}
        animate={hovered ? { x: '150%', opacity: 0.6 } : { x: '-100%', opacity: 0 }}
        transition={{ duration: 0.55, ease: 'easeInOut' }}
        style={{
          background: `linear-gradient(105deg, transparent, ${item.glow}20, transparent)`,
          width: '60%',
        }}
      />

      {/* Corner blob */}
      <div
        className="absolute -top-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-300"
        style={{ background: item.glow }}
      />

      {/* Icon */}
      <motion.div
        className="mb-4 relative z-10 inline-block drop-shadow-md"
        style={{ color: item.glow }}
        animate={hovered ? { rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.4 }}
      >
        <item.icon className="w-8 h-8" />
      </motion.div>

      <h3 className="text-xl font-black text-white mb-1 relative z-10">{item.name}</h3>
      <p className="text-sm font-medium relative z-10" style={{ color: item.glow }}>{item.desc}</p>

      {/* Stat chip */}
      <div className="mt-4 relative z-10">
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: `${item.glow}18`, color: item.glow, border: `1px solid ${item.glow}35` }}
        >
          {item.stat} {item.statLabel}
        </span>
      </div>
    </motion.div>
  );
}
