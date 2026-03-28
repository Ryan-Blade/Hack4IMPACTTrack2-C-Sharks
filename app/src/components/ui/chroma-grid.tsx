import { useRef, useEffect } from 'react';

interface ChromaGridProps {
  className?: string;
  /** The color of the glow, defaults to emerald */
  color?: string;
  cellSize?: number;
}

/**
 * A mouse-reactive chroma grid overlay. Draws a CSS grid of dots/lines
 * that glow near the cursor using a radial mask approach. Attach as an
 * absolute overlay on any relative-positioned container.
 */
export function ChromaGrid({ className = '', color = '#10b981', cellSize = 30 }: ChromaGridProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty('--mx', `${x}px`);
      el.style.setProperty('--my', `${y}px`);
    };

    // Also listen on the parent so the glow tracks even outside the overlay
    const parent = el.parentElement ?? el;
    parent.addEventListener('mousemove', onMove);
    return () => parent.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div
      ref={ref}
      className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${className}`}
      style={{
        // Dot grid
        backgroundImage: `radial-gradient(circle, ${color}55 1px, transparent 1px)`,
        backgroundSize: `${cellSize}px ${cellSize}px`,
        // Radial mask — glows at cursor, fades elsewhere
        WebkitMaskImage:
          'radial-gradient(circle 120px at var(--mx, 50%) var(--my, 50%), black 0%, transparent 100%)',
        maskImage:
          'radial-gradient(circle 120px at var(--mx, 50%) var(--my, 50%), black 0%, transparent 100%)',
      }}
    />
  );
}
