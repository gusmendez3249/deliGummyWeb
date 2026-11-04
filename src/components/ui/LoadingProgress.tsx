import { useEffect, useRef, useState } from 'react';

/**
 * Progreso "percibido" para esperas sin duración conocida.
 * Avanza rápido al inicio y va frenando sin detenerse nunca:
 *   0.5 s ≈ 30 %, 1 s ≈ 45 %, 2 s ≈ 65 %, 3 s ≈ 78 %, 5 s ≈ 89 %  (tope 96 %)
 * Al terminar salta a 100 % y se oculta: el usuario siente que "ya acabó".
 */
export function useFakeProgress(active: boolean, tauMs = 1800) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    if (active) {
      startRef.current = performance.now();
      setVisible(true);
      const tick = () => {
        const t = performance.now() - startRef.current;
        setProgress(0.12 + 0.84 * (1 - Math.exp(-t / tauMs)));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      setProgress((p) => (p > 0 ? 1 : 0));
      hideTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 450);
    }

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [active, tauMs]);

  return { progress, visible };
}

interface LoadingProgressProps {
  active: boolean;
  /** Texto que acompaña a la barra; puede cambiar según el avance */
  label?: string | ((pct: number) => string);
  className?: string;
}

/**
 * Barra de progreso visible con porcentaje y franjas animadas.
 */
export default function LoadingProgress({ active, label, className = '' }: LoadingProgressProps) {
  const { progress, visible } = useFakeProgress(active);
  if (!visible) return null;

  const pct = Math.round(progress * 100);
  const done = pct >= 100;
  const texto = typeof label === 'function' ? label(pct) : label;

  return (
    <div
      className={`w-full ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={texto || 'Cargando'}
      style={{ opacity: done ? 0 : 1, transition: 'opacity 300ms ease 150ms' }}
    >
      {texto !== undefined && (
        <div className="flex justify-between items-center mb-1 text-[11px] font-medium">
          <span className="text-primary">{done ? '¡Listo!' : texto}</span>
          <span className="text-text-secondary tabular-nums">{pct}%</span>
        </div>
      )}
      <div className="h-1.5 w-full rounded-full bg-primary/10 overflow-hidden">
        <div
          className="h-full rounded-full progress-stripes bg-primary"
          style={{
            width: `${pct}%`,
            transition: done ? 'width 200ms ease-out' : 'none',
          }}
        />
      </div>
    </div>
  );
}
