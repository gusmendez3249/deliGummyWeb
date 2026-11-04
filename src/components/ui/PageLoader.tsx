import { RouteLoadingIndicator } from './TopProgressBar';

/**
 * Esqueleto de página: muestra la "forma" del contenido mientras se descarga.
 * Se percibe más rápido que un spinner porque el usuario ya ve dónde aparecerá cada cosa.
 */
export default function PageLoader() {
  return (
    <RouteLoadingIndicator>
      <div className="space-y-6" aria-busy="true" aria-label="Cargando página">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded skeleton-shimmer" />
          <div className="h-3 w-72 rounded skeleton-shimmer" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-border p-5 shadow-sm space-y-3">
              <div className="h-3 w-24 rounded skeleton-shimmer" />
              <div className="h-7 w-32 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg border border-border p-5 shadow-sm space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 rounded skeleton-shimmer" style={{ width: `${95 - i * 7}%` }} />
          ))}
        </div>
      </div>
    </RouteLoadingIndicator>
  );
}
