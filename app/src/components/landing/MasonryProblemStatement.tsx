import { motion } from 'framer-motion';

const problems = [
  { id: 1, title: 'Wasted Surplus', text: 'Buildings generate solar power but lack a way to share surplus with neighbors, sending it back to the grid for pennies.', height: 200, color: 'from-emerald-500/20 to-transparent' },
  { id: 2, title: 'Grid Blackouts', text: 'A single point of failure in traditional grid lines leads to neighborhood-wide blackouts.', height: 160, color: 'from-amber-500/20 to-transparent' },
  { id: 3, title: 'Zero Transparency', text: 'Residents have no real-time data on energy flow or their contribution to sustainability.', height: 180, color: 'from-blue-500/20 to-transparent' },
  { id: 4, title: 'No Peer trading', text: 'Energy monopolies restrict direct peer-to-peer energy trades.', height: 150, color: 'from-purple-500/20 to-transparent' },
  { id: 5, title: 'Inefficient Storage', text: 'Battery reserves are managed statically rather than predictively.', height: 190, color: 'from-rose-500/20 to-transparent' },
];

export function MasonryProblemStatement() {
  return (
    <div className="w-full max-w-6xl mx-auto columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6 mt-12">
      {problems.map((item, idx) => (
        <motion.div
           key={item.id}
           initial={{ opacity: 0, y: 30 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 0.6, delay: idx * 0.1 }}
           className={`break-inside-avoid bg-gradient-to-b ${item.color} backdrop-blur-md rounded-2xl p-6 border border-white/5 hover:border-white/20 transition-all shadow-lg`}
           style={{ minHeight: item.height }}
        >
           <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
           <p className="text-slate-400">{item.text}</p>
        </motion.div>
      ))}
    </div>
  );
}
