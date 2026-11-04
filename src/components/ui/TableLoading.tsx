import LoadingProgress from './LoadingProgress';

interface TableLoadingProps {
  /** Número de columnas de la tabla (para el colSpan) */
  colSpan: number;
  /** Qué se está cargando, p. ej. "Cargando productos..." */
  label?: string;
  /** Filas de esqueleto a mostrar */
  rows?: number;
}

/**
 * Estado de carga para el <tbody> de una tabla: barra de progreso con porcentaje
 * y filas de esqueleto con brillo, para que la espera se perciba más corta.
 */
export default function TableLoading({ colSpan, label = 'Cargando datos...', rows = 5 }: TableLoadingProps) {
  return (
    <>
      <tr>
        <td colSpan={colSpan} className="px-4 pt-4 pb-2">
          <LoadingProgress
            active
            label={(pct) => (pct < 80 ? label : 'Casi listo...')}
            className="max-w-sm mx-auto"
          />
        </td>
      </tr>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          <td colSpan={colSpan} className="px-4 py-3">
            <div className="h-4 rounded skeleton-shimmer" style={{ width: `${100 - (i % 3) * 12}%` }} />
          </td>
        </tr>
      ))}
    </>
  );
}

/**
 * Lo mismo pero para secciones que no son tablas (tarjetas, listas, cuadrículas).
 */
export function SectionLoading({ label = 'Cargando datos...', rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div className="py-4 space-y-3" aria-busy="true">
      <LoadingProgress
        active
        label={(pct) => (pct < 80 ? label : 'Casi listo...')}
        className="max-w-sm mx-auto"
      />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded-md skeleton-shimmer" />
      ))}
    </div>
  );
}
