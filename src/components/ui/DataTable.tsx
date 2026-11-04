import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import TableLoading from './TableLoading';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  pagination?: {
    currentPage: number;
    lastPage: number;
    total: number;
    onPageChange: (page: number) => void;
    perPage?: number;
    onPerPageChange?: (perPage: number) => void;
  };
  actions?: (item: T) => React.ReactNode;
  emptyMessage?: string;
  isLoading?: boolean;
  /** Texto de la barra de progreso mientras carga */
  loadingLabel?: string;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchPlaceholder = 'Buscar...',
  onSearch,
  pagination,
  actions,
  emptyMessage = 'No hay datos para mostrar.',
  isLoading,
  loadingLabel = 'Cargando datos...',
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <div className="bg-white rounded-lg border border-border shadow-sm">
      {/* Search bar & Page Size Selector */}
      {(onSearch || (pagination && pagination.onPerPageChange)) && (
        <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row gap-3 items-center justify-between">
          {onSearch ? (
            <div className="relative w-full sm:max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          ) : (
            <div />
          )}

          {pagination && pagination.onPerPageChange && pagination.perPage !== undefined && (
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-text-secondary">Filas por página:</span>
              <select
                value={pagination.perPage}
                onChange={e => pagination.onPerPageChange?.(Number(e.target.value))}
                className="px-2.5 py-1.5 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border-t border-border">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-[#3071a9]">
            <tr className="bg-[#3071a9] text-white divide-x divide-slate-400">
              {columns.map((col) => (
                <th key={col.key} className={`px-4 py-2.5 font-bold uppercase tracking-wider text-xs text-white ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
              {actions && <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-xs text-white text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {isLoading ? (
              <TableLoading colSpan={columns.length + (actions ? 1 : 0)} label={loadingLabel} />
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-12 text-center text-text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors divide-x divide-slate-100 border-b border-slate-200">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-slate-800 ${col.className || ''}`}>
                      {col.render ? col.render(item) : String(item[col.key] ?? '')}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {actions(item)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer with Page Numbers */}
      {pagination && pagination.lastPage > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-surface/30 flex-wrap gap-2">
          <span className="text-xs text-text-secondary">
            Página <span className="font-semibold">{pagination.currentPage}</span> de{' '}
            <span className="font-semibold">{pagination.lastPage}</span> ({pagination.total} registros)
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
              className="px-2.5 py-1 text-xs font-medium border border-border rounded hover:bg-surface bg-white disabled:opacity-40"
            >
              Anterior
            </button>
            {Array.from({ length: pagination.lastPage }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => pagination.onPageChange(idx + 1)}
                className={`px-2.5 py-1 text-xs font-semibold border rounded ${
                  pagination.currentPage === idx + 1
                    ? 'bg-primary border-primary text-white'
                    : 'border-border hover:bg-surface bg-white text-text-primary'
                }`}
              >
                {idx + 1}
              </button>
            ))}
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.lastPage}
              className="px-2.5 py-1 text-xs font-medium border border-border rounded hover:bg-surface bg-white disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
