import type { ReactNode } from 'react';
import { DottedSurface } from '@/components/ui/dotted-surface';

export function WebGLFooter({ children }: { children?: ReactNode }) {
  return (
    <section 
      className="relative min-h-[500px] bg-zinc-950 overflow-hidden flex flex-col justify-between"
    >
      {/* Dotted surface fills the section */}
      <DottedSurface className="absolute inset-0 w-full h-full" />

      {/* Fade gradient: black from top so it blends into the section above */}
      <div className="absolute top-0 left-0 right-0 h-[160px] bg-gradient-to-b from-black to-transparent z-10 pointer-events-none" />

      {/* Children layer (e.g. Trust Indicators overlapping the animation) */}
      <div className="relative z-20 w-full pt-6">
        {children}
      </div>

      {/* Footer text sits on top, at the bottom */}
      <footer className="relative w-full z-20 px-10 pb-8 flex flex-wrap justify-between items-center gap-6 text-xs text-white/40 border-t border-emerald-500/10 font-mono mt-auto">
        <div className="flex flex-col gap-1.5">
          <span className="text-emerald-400 font-bold text-xs tracking-widest uppercase shadow-emerald-500/20 drop-shadow-lg">
            Simulating 50 buildings · LSTM · LangGraph · Polygon Mumbai
          </span>  
          <span className="text-emerald-500 font-semibold text-sm">
            ⚡ EcoSync — Team C-Sharks
          </span>
        </div>
        
        <div className="flex items-center gap-4 text-xs font-medium tracking-wider text-slate-400">
          <span>KIIT DU · 2026</span>
          <span>·</span>
          <a
            href="https://github.com/ecosync-hackathon"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-400 transition-colors duration-300 underline underline-offset-4 decoration-emerald-500/20"
          >
            github.com/ecosync-hackathon
          </a>
        </div>
      </footer>
    </section>
  );
}
