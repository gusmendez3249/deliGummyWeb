export function formatCurrency(amount: number | string): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(numericAmount || 0);
}

export function formatNumber(n: number | string): string {
  const numericN = typeof n === 'string' ? parseFloat(n) : n;
  return new Intl.NumberFormat('es-MX').format(numericN || 0);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function tipoMovimientoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    alta: 'Alta',
    baja: 'Baja',
    ajuste: 'Ajuste',
    salida_ruta: 'Salida ruta',
    devolucion_ruta: 'Devolucion ruta',
    venta_directa: 'Venta directa',
  };
  return labels[tipo] || tipo;
}

export function tipoMovimientoColor(tipo: string): string {
  const colors: Record<string, string> = {
    alta: 'bg-green-100 text-green-800',
    baja: 'bg-red-100 text-red-800',
    ajuste: 'bg-blue-100 text-blue-800',
    salida_ruta: 'bg-amber-100 text-amber-800',
    devolucion_ruta: 'bg-purple-100 text-purple-800',
    venta_directa: 'bg-teal-100 text-teal-800',
  };
  return colors[tipo] || 'bg-gray-100 text-gray-800';
}

export function estadoCargaColor(estado: string): string {
  return estado === 'abierta'
    ? 'bg-amber-100 text-amber-800'
    : 'bg-green-100 text-green-800';
}

export function estadoLiquidacionColor(estado: string): string {
  return estado === 'pendiente'
    ? 'bg-amber-100 text-amber-800'
    : 'bg-green-100 text-green-800';
}

export function tipoPagoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    fijo: 'Salario fijo',
    comision: 'Comision',
    mixto: 'Mixto',
  };
  return labels[tipo] || tipo;
}

export function periodoPagoLabel(periodo: string): string {
  const labels: Record<string, string> = {
    diario: 'Diario',
    semanal: 'Semanal',
    quincenal: 'Quincenal',
    mensual: 'Mensual',
  };
  return labels[periodo] || periodo;
}

export function toLocalDateString(d?: Date): string {
  const date = d || new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
