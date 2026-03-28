import { motion } from 'framer-motion';
import { PulseBeams } from '@/components/ui/pulse-beams';
import { Zap, AlertTriangle, Eye, Users, Battery } from 'lucide-react';

const problems = [
  {
    id: 1,
    title: 'Wasted Surplus',
    text: 'Buildings generate solar power but lack a way to share surplus with neighbors, sending it back to the grid for pennies.',
    icon: Zap,
    color: 'from-emerald-500/20 to-emerald-500/5',
    border: 'border-emerald-500/20 hover:border-emerald-400/50',
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    glow: 'shadow-emerald-500/10',
  },
  {
    id: 2,
    title: 'Grid Blackouts',
    text: 'A single point of failure in traditional grid lines leads to neighborhood-wide blackouts.',
    icon: AlertTriangle,
    color: 'from-amber-500/20 to-amber-500/5',
    border: 'border-amber-500/20 hover:border-amber-400/50',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    glow: 'shadow-amber-500/10',
  },
  {
    id: 3,
    title: 'No Peer Trading',
    text: 'Energy monopolies restrict direct peer-to-peer energy trades, keeping costs artificially high.',
    icon: Users,
    color: 'from-purple-500/20 to-purple-500/5',
    border: 'border-purple-500/20 hover:border-purple-400/50',
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
    glow: 'shadow-purple-500/10',
  },
  {
    id: 4,
    title: 'Zero Transparency',
    text: 'Residents have no real-time data on energy flow or their contribution to sustainability.',
    icon: Eye,
    color: 'from-blue-500/20 to-blue-500/5',
    border: 'border-blue-500/20 hover:border-blue-400/50',
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    glow: 'shadow-blue-500/10',
  },
  {
    id: 5,
    title: 'Inefficient Storage',
    text: 'Battery reserves are managed statically rather than predictively, wasting valuable stored energy.',
    icon: Battery,
    color: 'from-rose-500/20 to-rose-500/5',
    border: 'border-rose-500/20 hover:border-rose-400/50',
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/10',
    glow: 'shadow-rose-500/10',
  },
];

// Beam paths tuned for 900×500 viewBox to arc gracefully between card connection points
const beams = [
  // Top-left card → bottom-left card
  {
    path: 'M200 140 C200 260, 120 320, 120 420',
    gradientConfig: {
      initial: { x1: '0%', x2: '0%', y1: '0%', y2: '20%' },
      animate: {
        x1: ['0%', '0%', '0%'],
        x2: ['0%', '0%', '0%'],
        y1: ['0%', '50%', '100%'],
        y2: ['20%', '70%', '120%'],
      },
      transition: { duration: 2.5, repeat: Infinity, repeatType: 'loop', ease: 'linear', repeatDelay: 1.5, delay: 0 },
    },
    connectionPoints: [
      { cx: 200, cy: 140, r: 5 },
      { cx: 120, cy: 420, r: 5 },
    ],
  },
  // Top-right card → bottom-right card
  {
    path: 'M700 140 C700 260, 780 320, 780 420',
    gradientConfig: {
      initial: { x1: '100%', x2: '100%', y1: '0%', y2: '20%' },
      animate: {
        x1: ['100%', '100%', '100%'],
        x2: ['100%', '100%', '100%'],
        y1: ['0%', '50%', '100%'],
        y2: ['20%', '70%', '120%'],
      },
      transition: { duration: 2.5, repeat: Infinity, repeatType: 'loop', ease: 'linear', repeatDelay: 1.5, delay: 0.4 },
    },
    connectionPoints: [
      { cx: 700, cy: 140, r: 5 },
      { cx: 780, cy: 420, r: 5 },
    ],
  },
  // Top-left → top-right (horizontal bridge)
  {
    path: 'M200 100 C350 60, 550 60, 700 100',
    gradientConfig: {
      initial: { x1: '0%', x2: '20%', y1: '50%', y2: '50%' },
      animate: {
        x1: ['0%', '50%', '100%'],
        x2: ['20%', '70%', '120%'],
        y1: ['50%', '50%', '50%'],
        y2: ['50%', '50%', '50%'],
      },
      transition: { duration: 2.2, repeat: Infinity, repeatType: 'loop', ease: 'linear', repeatDelay: 1.8, delay: 0.8 },
    },
    connectionPoints: [
      { cx: 200, cy: 100, r: 5 },
      { cx: 700, cy: 100, r: 5 },
    ],
  },
  // Center card → bottom-center card
  {
    path: 'M450 150 L450 390',
    gradientConfig: {
      initial: { x1: '50%', x2: '50%', y1: '0%', y2: '20%' },
      animate: {
        x1: ['50%', '50%', '50%'],
        x2: ['50%', '50%', '50%'],
        y1: ['0%', '50%', '100%'],
        y2: ['20%', '70%', '120%'],
      },
      transition: { duration: 2, repeat: Infinity, repeatType: 'loop', ease: 'linear', repeatDelay: 2, delay: 1.2 },
    },
    connectionPoints: [
      { cx: 450, cy: 150, r: 5 },
      { cx: 450, cy: 390, r: 5 },
    ],
  },
  // Bottom-left → bottom-right (horizontal bridge)
  {
    path: 'M120 460 C280 500, 620 500, 780 460',
    gradientConfig: {
      initial: { x1: '0%', x2: '20%', y1: '50%', y2: '50%' },
      animate: {
        x1: ['0%', '50%', '100%'],
        x2: ['20%', '70%', '120%'],
        y1: ['50%', '50%', '50%'],
        y2: ['50%', '50%', '50%'],
      },
      transition: { duration: 2.4, repeat: Infinity, repeatType: 'loop', ease: 'linear', repeatDelay: 1.6, delay: 1.6 },
    },
    connectionPoints: [
      { cx: 120, cy: 460, r: 5 },
      { cx: 780, cy: 460, r: 5 },
    ],
  },
];

const gradientColors = {
  start: '#10b981',
  middle: '#6344F5',
  end: '#34d399',
};

export function PulseBeamsProblemStatement() {
  return (
    <PulseBeams
      beams={beams}
      gradientColors={gradientColors}
      width={900}
      height={500}
      baseColor="#1e293b"
      accentColor="#334155"
      className="py-4 min-h-0"
    >
      {/* 2-col top row + 3-col bottom row → perfectly symmetric with 5 items */}
      <div className="w-full max-w-5xl mx-auto px-4">
        {/* Row 1 — 2 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          {problems.slice(0, 2).map((item, idx) => (
            <ProblemCard key={item.id} item={item} delay={idx * 0.1} />
          ))}
        </div>
        {/* Row 2 — 3 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {problems.slice(2).map((item, idx) => (
            <ProblemCard key={item.id} item={item} delay={(idx + 2) * 0.1} />
          ))}
        </div>
      </div>
    </PulseBeams>
  );
}

function ProblemCard({
  item,
  delay,
}: {
  item: (typeof problems)[0];
  delay: number;
}) {
  const Icon = item.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={`group relative rounded-2xl p-6 border backdrop-blur-md
        bg-gradient-to-br ${item.color} ${item.border}
        shadow-lg ${item.glow} transition-all duration-300`}
    >
      {/* Subtle inner glow on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 70%)' }}
      />
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${item.iconBg} mb-4`}>
        <Icon className={`w-5 h-5 ${item.iconColor}`} />
      </div>
      <h3 className="text-lg font-bold text-white mb-2 leading-snug">{item.title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{item.text}</p>
    </motion.div>
  );
}
