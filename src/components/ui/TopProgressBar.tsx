import { useEffect, useRef, useState } from 'react';
import { loadingBus } from '../../utils/loadingBus';

/**
 * Barra de progreso superior (estilo YouTube / GitHub).
 *
 * Trucos de "velocidad percibida":
 * - No aparece si la carga dura menos de 150 ms (evita parpadeos).
 * - Arranca rápido y va frenando (curva exponencial): siempre se mueve, nunca se ve detenida.
 * - Al terminar, se completa al 100 % de golpe y se desvanece: da sensación de "¡listo!".
 */
const RETRASO_MS = 150;
const TAU_MS = 1800; // qué tan rápido se acerca al tope (a los 3 s va ~80 %, a los 5 s ~90 %)

export default function TopProgressBar() {
  const [progreso, setProgreso] = useState(0);
  const [visible, setVisible] = useState(false);
  const inicioRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const retrasoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ocultarRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activoRef = useRef(false);
  const terminarRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const animar = () => {
      const t = performance.now() - inicioRef.current;
      // Empieza en 10 % y se acerca asintóticamente a 95 %
      setProgreso(0.1 + 0.85 * (1 - Math.exp(-t / TAU_MS)));
      rafRef.current = requestAnimationFrame(animar);
    };

    const detenerAnimacion = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };

    const terminar = () => {
      terminarRef.current = null;
      activoRef.current = false;
      if (retrasoRef.current) clearTimeout(retrasoRef.current);
      detenerAnimacion();
      setProgreso((p) => (p > 0 ? 1 : 0));
      ocultarRef.current = setTimeout(() => {
        setVisible(false);
        setProgreso(0);
      }, 350);
    };

    return loadingBus.subscribe((activos) => {
      if (activos > 0) {
        if (terminarRef.current) {
          // Llegó otra carga justo al terminar la anterior (p. ej. cambiar de mes rápido):
          // la barra sigue avanzando sin reiniciarse ni parpadear.
          clearTimeout(terminarRef.current);
          terminarRef.current = null;
        }
        if (!activoRef.current) {
          // Empieza una carga
          activoRef.current = true;
          if (ocultarRef.current) clearTimeout(ocultarRef.current);
          retrasoRef.current = setTimeout(() => {
            inicioRef.current = performance.now();
            setVisible(true);
            detenerAnimacion();
            rafRef.current = requestAnimationFrame(animar);
          }, RETRASO_MS);
        }
      } else if (activoRef.current && !terminarRef.current) {
        // Terminó todo: se espera un instante por si viene otra carga encadenada
        terminarRef.current = setTimeout(terminar, 80);
      }
    });
  }, []);

  if (!visible && progreso === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
      role="progressbar"
      aria-label="Cargando"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progreso * 100)}
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 300ms ease 100ms' }}
    >
      <div
        className="h-full bg-gradient-to-r from-sky-400 via-primary to-indigo-500 shadow-[0_0_10px_rgba(37,99,235,0.7)]"
        style={{
          width: `${progreso * 100}%`,
          transition: progreso === 1 ? 'width 200ms ease-out' : 'none',
        }}
      />
    </div>
  );
}

/**
 * Para usar como fallback de <Suspense>: mientras una página se descarga,
 * también avanza la barra superior.
 */
export function RouteLoadingIndicator({ children }: { children?: React.ReactNode }) {
  useEffect(() => {
    loadingBus.start();
    return () => loadingBus.done();
  }, []);
  return <>{children}</>;
}
