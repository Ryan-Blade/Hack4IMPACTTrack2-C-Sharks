import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';

/* ─────────────────────────────────────────────
   Simulated Blockchain Transaction Data
───────────────────────────────────────────── */
const BUILDING_NAMES = [
  'Solar Tower A', 'Eco Hub B', 'Green Apt C', 'Wind Block D', 'BioCenter E',
  'Smart Office F', 'Nano House G', 'Grid Point H', 'Solar Plaza J', 'Volt Hall K',
  'Charge Deck L', 'Flux Pod M', 'Beam Unit N', 'Arc Lab P', 'Ion Gate Q',
];

const TX_TYPES = ['P2P_TRADE', 'BATTERY_SELL', 'SURPLUS_EXPORT', 'EMERGENCY_BUY'] as const;

interface TxItem {
  id: string;
  from: string;
  to: string;
  amount: number;
  price: number;
  type: typeof TX_TYPES[number];
  timestamp: number;
  hash: string;
}

function randomHex(len: number) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function generateTx(): TxItem {
  const from = BUILDING_NAMES[Math.floor(Math.random() * BUILDING_NAMES.length)];
  let to = BUILDING_NAMES[Math.floor(Math.random() * BUILDING_NAMES.length)];
  while (to === from) to = BUILDING_NAMES[Math.floor(Math.random() * BUILDING_NAMES.length)];
  return {
    id: randomHex(8),
    from,
    to,
    amount: +(1 + Math.random() * 15).toFixed(2),
    price: +(0.05 + Math.random() * 0.45).toFixed(3),
    type: TX_TYPES[Math.floor(Math.random() * TX_TYPES.length)],
    timestamp: Date.now(),
    hash: `0x${randomHex(16)}`,
  };
}

/* ─────────────────────────────────────────────
   Live Blockchain Feed Component
───────────────────────────────────────────── */
export function LiveBlockchainFeed() {
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [blockNumber, setBlockNumber] = useState(84201);

  useEffect(() => {
    // Seed initial transactions
    setTransactions(Array.from({ length: 5 }, generateTx));

    const interval = setInterval(() => {
      setTransactions(prev => {
        const newTx = generateTx();
        return [newTx, ...prev.slice(0, 7)];
      });
      setBlockNumber(prev => prev + 1);
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  const typeColors: Record<string, string> = {
    P2P_TRADE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    BATTERY_SELL: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    SURPLUS_EXPORT: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    EMERGENCY_BUY: 'text-red-400 bg-red-500/10 border-red-500/30',
  };

  const blockRef = useRef<HTMLDivElement>(null);
  const blockInView = useInView(blockRef, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={blockRef}
      initial={{ opacity: 0, y: 40 }}
      animate={blockInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border border-white/8 bg-slate-900/60 backdrop-blur-md p-1"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
            <div className="absolute inset-0 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping opacity-60" />
          </div>
          <span className="text-sm font-bold text-white">EcoToken Ledger</span>
          <motion.span
            className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            LIVE
          </motion.span>
        </div>
        <motion.div
          className="text-xs text-slate-500 font-mono"
          key={blockNumber}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          Block #{blockNumber.toLocaleString()}
        </motion.div>
      </div>

      {/* Transaction List with AnimatePresence */}
      <div className="divide-y divide-white/5 max-h-[340px] overflow-hidden">
        <AnimatePresence mode="popLayout">
          {transactions.map((tx, i) => (
            <motion.div
              key={tx.id}
              layout
              initial={{ opacity: 0, y: -24, scale: 0.97 }}
              animate={{ opacity: 1 - i * 0.08, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="px-5 py-3 flex items-center gap-4 hover:bg-white/[0.03] transition-colors"
            >
              {/* Type badge */}
              <span className={`text-[9px] px-2 py-1 rounded-md border font-bold uppercase tracking-wider shrink-0 ${typeColors[tx.type]}`}>
                {tx.type.replace('_', ' ')}
              </span>

              {/* From → To */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-300 font-medium truncate">{tx.from}</span>
                  <svg className="w-3 h-3 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span className="text-slate-300 font-medium truncate">{tx.to}</span>
                </div>
                <div className="text-[10px] text-slate-600 font-mono mt-0.5">{tx.hash}</div>
              </div>

              {/* Amount + Price */}
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-white">{tx.amount} kWh</div>
                <div className="text-[10px] text-emerald-400 font-mono">${tx.price}/kWh</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Animated Energy Flow SVG Diagram
───────────────────────────────────────────── */
interface FlowNode {
  id: string;
  x: number;
  y: number;
  label: string;
  color: string;
  energy: number;
}

export function EnergyFlowDiagram() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60);
    return () => clearInterval(interval);
  }, []);

  const nodes: FlowNode[] = useMemo(() => [
    { id: 'solar',   x: 100, y: 60,  label: '☀️ Solar Array',    color: '#f59e0b', energy: 0 },
    { id: 'battery', x: 300, y: 60,  label: '🔋 Battery Storage', color: '#10b981', energy: 0 },
    { id: 'grid',    x: 500, y: 60,  label: '⚡ Smart Grid',      color: '#3b82f6', energy: 0 },
    { id: 'home1',   x: 100, y: 200, label: '🏠 Residential',     color: '#a855f7', energy: 0 },
    { id: 'office',  x: 300, y: 200, label: '🏢 Commercial',      color: '#06b6d4', energy: 0 },
    { id: 'ev',      x: 500, y: 200, label: '🚗 EV Station',      color: '#ec4899', energy: 0 },
  ], []);

  const connections = useMemo(() => [
    { from: 0, to: 1 }, { from: 0, to: 3 }, { from: 1, to: 2 },
    { from: 1, to: 4 }, { from: 2, to: 5 }, { from: 3, to: 4 },
    { from: 4, to: 5 }, { from: 2, to: 3 },
  ], []);

  const flowRef = useRef<HTMLDivElement>(null);
  const flowInView = useInView(flowRef, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={flowRef}
      initial={{ opacity: 0, y: 40 }}
      animate={flowInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border border-white/8 bg-slate-900/60 backdrop-blur-md p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <div className="w-2.5 h-2.5 bg-blue-400 rounded-full" />
          <div className="absolute inset-0 w-2.5 h-2.5 bg-blue-400 rounded-full animate-ping opacity-60" />
        </div>
        <span className="text-sm font-bold text-white">Energy Flow — Real-Time Transfers</span>
      </div>

      <svg viewBox="0 0 600 270" className="w-full" style={{ maxHeight: '320px' }}>
        <defs>
          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Animated gradient for energy particles */}
          <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Connection lines with animated particles */}
        {connections.map((conn, i) => {
          const from = nodes[conn.from];
          const to = nodes[conn.to];
          const progress = ((tick * 1.2 + i * 40) % 200) / 200;
          const px = from.x + (to.x - from.x) * progress;
          const py = from.y + (to.y - from.y) * progress;

          return (
            <g key={i}>
              {/* Base line */}
              <line
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke="rgba(16,185,129,0.12)" strokeWidth="1.5"
              />
              {/* Animated energy particle */}
              <circle
                cx={px} cy={py} r="4"
                fill={from.color}
                filter="url(#glow)"
                opacity={0.9}
              />
              {/* Trailing glow */}
              <circle
                cx={px} cy={py} r="8"
                fill={from.color}
                opacity={0.15}
              />
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const pulse = 0.85 + 0.15 * Math.sin(tick * 0.04 + node.x * 0.02);
          return (
            <g key={node.id}>
              {/* Outer glow ring */}
              <circle
                cx={node.x} cy={node.y} r={28 * pulse}
                fill="none" stroke={node.color}
                strokeWidth="1" opacity={0.2}
              />
              {/* Node body */}
              <circle
                cx={node.x} cy={node.y} r="20"
                fill={`${node.color}20`}
                stroke={node.color}
                strokeWidth="1.5"
                opacity={0.9}
              />
              {/* Inner dot */}
              <circle
                cx={node.x} cy={node.y} r="5"
                fill={node.color}
                opacity={pulse}
                filter="url(#glow)"
              />
              {/* Label */}
              <text
                x={node.x} y={node.y + 38}
                textAnchor="middle"
                fill="white"
                fontSize="10"
                fontWeight="600"
                opacity="0.8"
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   P2P Trading Network Canvas Animation
───────────────────────────────────────────── */
interface P2PNode {
  x: number; y: number;
  vx: number; vy: number;
  selling: boolean;
  energy: number;
  name: string;
}

export function P2PNetworkVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const nodesRef = useRef<P2PNode[]>([]);
  const [stats, setStats] = useState({ trades: 0, volume: 0, savings: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 600, H = 300;
    canvas.width = W * 2;
    canvas.height = H * 2;
    ctx.scale(2, 2);

    // Initialize building nodes
    nodesRef.current = Array.from({ length: 20 }, (_, i) => ({
      x: 40 + Math.random() * (W - 80),
      y: 40 + Math.random() * (H - 80),
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      selling: Math.random() > 0.5,
      energy: 20 + Math.random() * 80,
      name: `B${i + 1}`,
    }));

    let t = 0;
    let tradeCount = 0;
    let tradeVolume = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      t += 0.02;

      const nodes = nodesRef.current;

      // Move nodes slightly
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 30 || n.x > W - 30) n.vx *= -1;
        if (n.y < 30 || n.y > H - 30) n.vy *= -1;
        // Random state changes
        if (Math.random() < 0.002) n.selling = !n.selling;
        n.energy = Math.max(10, Math.min(100, n.energy + (Math.random() - 0.5) * 2));
      }

      // Draw trade connections (sellers → buyers)
      const TRADE_DIST = 160;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (nodes[i].selling === nodes[j].selling) continue;
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > TRADE_DIST) continue;

          const alpha = (1 - dist / TRADE_DIST) * 0.25;
          const seller = nodes[i].selling ? nodes[i] : nodes[j];
          const buyer = nodes[i].selling ? nodes[j] : nodes[i];

          // Draw trade line
          ctx.beginPath();
          ctx.moveTo(seller.x, seller.y);
          ctx.lineTo(buyer.x, buyer.y);
          ctx.strokeStyle = `rgba(16,185,129,${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Animated energy particle along trade line
          const progress = ((t * 60 + i * 20 + j * 13) % 100) / 100;
          const px = seller.x + (buyer.x - seller.x) * progress;
          const py = seller.y + (buyer.y - seller.y) * progress;

          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(16,185,129,${alpha * 3})`;
          ctx.fill();

          // Count trades
          if (Math.random() < 0.001) {
            tradeCount++;
            tradeVolume += +(Math.random() * 5).toFixed(1);
          }
        }
      }

      // Draw building nodes
      for (const n of nodes) {
        const pulse = 0.7 + 0.3 * Math.sin(t * 2 + n.x * 0.05);
        const color = n.selling ? '#22c55e' : '#f59e0b';
        const radius = 5 + (n.energy / 100) * 5;

        // Outer glow
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = n.selling
          ? `rgba(34,197,94,${0.08 * pulse})`
          : `rgba(245,158,11,${0.08 * pulse})`;
        ctx.fill();

        // Node circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `${color}${Math.round(pulse * 200).toString(16).padStart(2, '0')}`;
        ctx.fill();
        ctx.strokeStyle = `${color}80`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '8px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(n.name, n.x, n.y + radius + 12);
      }

      // Update stats periodically
      if (Math.round(t * 50) % 50 === 0) {
        setStats({
          trades: tradeCount,
          volume: +tradeVolume.toFixed(1),
          savings: +(tradeVolume * 0.12).toFixed(2),
        });
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-slate-900/60 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-2.5 h-2.5 bg-purple-400 rounded-full" />
            <div className="absolute inset-0 w-2.5 h-2.5 bg-purple-400 rounded-full animate-ping opacity-60" />
          </div>
          <span className="text-sm font-bold text-white">P2P Energy Trading Network</span>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Selling
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Buying
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="px-2 py-2">
        <canvas
          ref={canvasRef}
          className="w-full rounded-xl"
          style={{ maxHeight: '300px', aspectRatio: '2 / 1' }}
        />
      </div>

      {/* Stats footer */}
      <div className="grid grid-cols-3 divide-x divide-white/8 border-t border-white/8">
        <div className="px-4 py-3 text-center">
          <div className="text-lg font-black text-emerald-400 tabular-nums">{stats.trades}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Trades</div>
        </div>
        <div className="px-4 py-3 text-center">
          <div className="text-lg font-black text-blue-400 tabular-nums">{stats.volume} kWh</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Volume</div>
        </div>
        <div className="px-4 py-3 text-center">
          <div className="text-lg font-black text-amber-400 tabular-nums">${stats.savings}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Savings</div>
        </div>
      </div>
    </div>
  );
}
