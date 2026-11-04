import { useEffect, useRef, useState } from 'react';
import { loadingBus, type Tarea } from '../../utils/loadingBus';
import LoadingProgress from './LoadingProgress';

const RETRASO_MS = 200; // si la acción termina antes, no se muestra nada

/**
 * Tarjeta flotante (abajo a la derecha) que aparece automáticamente al guardar,
 * editar, eliminar o exportar en cualquier pantalla, con barra de progreso y porcentaje.
 */
export default function TaskProgressToast() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [mostrar, setMostrar] = useState(false);
  const [ultimaEtiqueta, setUltimaEtiqueta] = useState('');
  const retrasoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ocultarRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => loadingBus.subscribeTasks(setTareas), []);

  const activa = tareas.length > 0;

  useEffect(() => {
    if (activa) {
      setUltimaEtiqueta(tareas[tareas.length - 1].label);
      if (ocultarRef.current) clearTimeout(ocultarRef.current);
      if (!mostrar && !retrasoRef.current) {
        retrasoRef.current = setTimeout(() => {
          retrasoRef.current = null;
          setMostrar(true);
        }, RETRASO_MS);
      }
    } else {
      if (retrasoRef.current) {
        clearTimeout(retrasoRef.current);
        retrasoRef.current = null;
      }
      // Deja ver el "¡Listo!" un momento antes de ocultar
      ocultarRef.current = setTimeout(() => setMostrar(false), 900);
    }
  }, [activa, tareas, mostrar]);

  if (!mostrar) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9998] w-72 max-w-[calc(100vw-2rem)] bg-white border border-border rounded-lg shadow-lg p-3"
      role="status"
      aria-live="polite"
    >
      <LoadingProgress
        active={activa}
        label={(pct) => (pct < 85 ? ultimaEtiqueta : 'Casi listo...')}
      />
      {tareas.length > 1 && (
        <p className="mt-1 text-[10px] text-text-muted">{tareas.length} operaciones en curso</p>
      )}
    </div>
  );
}
