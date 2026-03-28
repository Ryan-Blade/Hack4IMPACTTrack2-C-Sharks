import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

/**
 * ScrollStack — wraps items in a scroll-snap container.
 * Each item takes up the full viewport height and is centered.
 */
export function ScrollStack({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`w-full overflow-y-auto ${className}`}
      style={{
        height: '100vh',
        scrollSnapType: 'y mandatory',
        scrollBehavior: 'smooth',
      }}
    >
      {children}
    </div>
  );
}

export function ScrollStackItem({ children, index = 0 }: { children: ReactNode; index?: number }) {
  return (
    <motion.div
      className="w-full flex items-center justify-center"
      style={{ height: '100vh', scrollSnapAlign: 'start' }}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.05 }}
    >
      <div className="w-full max-w-3xl mx-auto bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-10 shadow-2xl transition-transform hover:scale-[1.01] hover:border-emerald-500/40">
        {children}
      </div>
    </motion.div>
  );
}
