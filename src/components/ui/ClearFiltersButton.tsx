import { X } from 'lucide-react';

interface ClearFiltersButtonProps {
  onClick: () => void;
  visible: boolean;
  className?: string;
}

export default function ClearFiltersButton({ onClick, visible, className = '' }: ClearFiltersButtonProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100/80 border border-red-200 hover:border-red-300 rounded-md transition-colors shadow-sm focus:outline-none focus:ring-1 focus:ring-red-400 ${className}`}
      title="Limpiar filtros"
    >
      <X size={14} />
      <span>Limpiar filtros</span>
    </button>
  );
}
