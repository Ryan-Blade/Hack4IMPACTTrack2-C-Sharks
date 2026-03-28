import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ChromaGrid } from '@/components/ui/chroma-grid';
import { RadioReceiver, MessageSquare, Terminal, BrainCircuit, Bot, Link2, Globe } from 'lucide-react';

const flow = [
  { layer: 'Devices',    name: 'IoT Sensor Network',   format: 'MQTT / JSON',     color: '#10b981', icon: RadioReceiver },
  { layer: 'Messaging',  name: 'Mosquitto MQTT Broker',      format: 'Paho listener',   color: '#06b6d4', icon: MessageSquare },
  { layer: 'Backend',    name: 'FastAPI Backend',            format: 'LSTM inference',  color: '#8b5cf6', icon: Terminal },
  { layer: 'Brain',      name: 'TensorFlow LSTM Model',      format: 'Agent state',     color: '#f59e0b', icon: BrainCircuit },
  { layer: 'Agents',     name: 'LangGraph AI Agents',        format: 'Trade agreement', color: '#ec4899', icon: Bot },
  { layer: 'Blockchain', name: 'Polygon Smart Contract',     format: 'WebSocket',       color: '#6366f1', icon: Link2 },
  { layer: 'Frontend',   name: 'React Live Dashboard',       format: '',                color: '#10b981', icon: Globe },
];

export function ArchitectureFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <div ref={ref} className="flex flex-col items-center max-w-3xl mx-auto mt-12 w-full">
      {flow.map((item, idx) => (
        <FlowItem key={item.name} item={item} idx={idx} inView={inView} isLast={idx === flow.length - 1} />
      ))}
    </div>
  );
}

function FlowItem({
  item,
  idx,
  inView,
  isLast,
}: {
  item: typeof flow[0];
  idx: number;
  inView: boolean;
  isLast: boolean;
}) {
  const isEven = idx % 2 === 0;

  return (
    <div className="flex flex-col items-center w-full">
      <motion.div
        className="w-full relative bg-slate-900/50 backdrop-blur-md rounded-2xl p-5 border overflow-hidden group cursor-default"
        style={{ borderColor: `${item.color}25` }}
        initial={{ opacity: 0, x: isEven ? -50 : 50, scale: 0.95 }}
        animate={inView ? { opacity: 1, x: 0, scale: 1 } : {}}
        transition={{ duration: 0.55, delay: idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{
          borderColor: `${item.color}70`,
          boxShadow: `0 0 32px -8px ${item.color}50`,
          y: -3,
        }}
      >
        {/* ChromaGrid overlay */}
        <ChromaGrid color={item.color} cellSize={28} />

        {/* Content */}
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-center justify-between gap-3 text-center md:text-left">
          {/* Layer badge */}
          <div className="flex items-center gap-2 w-full md:w-1/4">
            <motion.div
              className="text-lg"
              animate={inView ? { rotate: [0, -10, 10, 0] } : {}}
              transition={{ delay: idx * 0.1 + 0.4, duration: 0.5 }}
              style={{ color: item.color }}
            >
              <item.icon className="w-5 h-5 md:w-6 md:h-6" />
            </motion.div>
            <span
              className="text-[10px] uppercase tracking-widest font-black"
              style={{ color: item.color }}
            >
              {item.layer}
            </span>
          </div>

          {/* Layer name */}
          <div className="text-base md:text-lg font-bold text-white w-full md:w-1/2 md:text-center">
            {item.name}
          </div>

          {/* Format */}
          <div className="text-xs text-slate-400 w-full md:w-1/4 md:text-right font-mono tracking-tight">
            {item.format}
          </div>
        </div>

        {/* Left accent bar */}
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ background: item.color }}
          initial={{ scaleY: 0 }}
          animate={inView ? { scaleY: 1 } : {}}
          transition={{ delay: idx * 0.1 + 0.2, duration: 0.4, ease: 'easeOut' }}
        />
      </motion.div>

      {/* Connector arrow */}
      {!isLast && (
        <motion.div
          className="py-2 flex flex-col items-center gap-1"
          initial={{ opacity: 0, scaleY: 0 }}
          animate={inView ? { opacity: 1, scaleY: 1 } : {}}
          transition={{ delay: idx * 0.1 + 0.35, duration: 0.3 }}
        >
          <motion.div
            className="w-px h-5 rounded-full"
            style={{ background: `linear-gradient(to bottom, ${item.color}60, ${flow[idx + 1]?.color ?? item.color}60)` }}
          />
          <motion.div
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.2 }}
            style={{ color: item.color }}
            className="opacity-80"
          >
            <svg width="12" height="8" viewBox="0 0 12 8" fill="currentColor">
              <path d="M6 8L0 0h12L6 8z" />
            </svg>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
