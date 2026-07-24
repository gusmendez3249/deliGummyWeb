import { useEffect, useState, useCallback } from 'react';
import { Package, AlertTriangle, DollarSign, TrendingUp, Users, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import StatsCard from '../../components/ui/StatsCard';
import api from '../../api/axios';
import { formatCurrency, formatNumber, tipoMovimientoLabel, tipoMovimientoColor, formatDateTime } from '../../utils/formatters';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

interface DashboardStatsExtended {
  fecha_inicio: string;
  fecha_fin: string;
  stock_total: number;
  valor_inventario: number;
  productos_stock_bajo: number;
  productos_stock_bajo_lista: any[];
  ventas_rango: number;
  ganancia_rango: number;
  total_devoluciones: number;
  vendedores_activos: number;
  ultimos_movimientos: any[];
  ventas_semana: { fecha: string; total: number }[];
  top_productos: { nombre: string; total_vendido: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStatsExtended | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'dia' | 'semana' | 'mes' | 'ano'>('semana');
  const [offset, setOffset] = useState(0);

  // Helper to get local date string YYYY-MM-DD to avoid UTC shift
  const toLocalDateString = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Helper to calculate date range based on period and offset
  const getDates = useCallback((p: 'dia' | 'semana' | 'mes' | 'ano', off: number) => {
    const today = new Date();
    if (p === 'dia') {
      today.setDate(today.getDate() + off);
      const str = toLocalDateString(today);
      return { start: str, end: str };
    }
    if (p === 'semana') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1) + (off * 7);
      const start = new Date(today.setDate(diff));
      // Reset date reference to start of week to add 6 days correctly
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start: toLocalDateString(start), end: toLocalDateString(end) };
    }
    if (p === 'mes') {
      const year = today.getFullYear();
      const month = today.getMonth() + off;
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return { start: toLocalDateString(start), end: toLocalDateString(end) };
    }
    if (p === 'ano') {
      const year = today.getFullYear() + off;
      const start = new Date(year, 0, 1);
      const end = new Date(year, 12, 0);
      return { start: toLocalDateString(start), end: toLocalDateString(end) };
    }
    return { start: '', end: '' };
  }, []);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDates(period, offset);
      const res = await api.get('/dashboard/stats', {
        params: { fecha_inicio: start, fecha_fin: end }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, [period, offset, getDates]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Format label showing current date selection
  const getPeriodLabel = () => {
    if (!stats) return '';
    if (period === 'dia') {
      return `Día: ${stats.fecha_inicio}`;
    }
    if (period === 'semana') {
      return `Semana: del ${stats.fecha_inicio} al ${stats.fecha_fin}`;
    }
    if (period === 'mes') {
      const parts = stats.fecha_inicio.split('-');
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return `Mes: ${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
    }
    if (period === 'ano') {
      return `Año: ${stats.fecha_inicio.split('-')[0]}`;
    }
    return '';
  };

  const handlePrev = () => setOffset(prev => prev - 1);
  const handleNext = () => setOffset(prev => prev + 1);
  const handleReset = () => setOffset(0);

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-border p-5 shadow-sm animate-pulse">
              <div className="h-4 bg-gray-100 rounded mb-2 w-24" />
              <div className="h-7 bg-gray-100 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const barChartData = {
    labels: stats.ventas_semana.length > 0
      ? stats.ventas_semana.map(v => v.fecha)
      : ['Sin datos'],
    datasets: [{
      label: 'Ventas',
      data: stats.ventas_semana.length > 0
        ? stats.ventas_semana.map(v => v.total)
        : [0],
      backgroundColor: '#2563EB',
      borderRadius: 4,
      barThickness: 28,
    }],
  };

  const doughnutData = {
    labels: stats.top_productos.map(p => p.nombre),
    datasets: [{
      data: stats.top_productos.map(p => p.total_vendido),
      backgroundColor: ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#7C3AED'],
      borderWidth: 0,
    }],
  };

  return (
    <div className="space-y-6">
      {/* Header and Period Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
          <p className="text-xs text-text-secondary">Estadísticas e Indicadores de Negocio</p>
        </div>

        {/* Date / Period selection controls */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg border border-border shadow-sm">
          <div className="flex bg-gray-100 p-0.5 rounded-md text-xs font-semibold">
            {(['dia', 'semana', 'mes', 'ano'] as const).map(p => (
              <button
                key={p}
                onClick={() => { setPeriod(p); setOffset(0); }}
                className={`px-2.5 py-1 capitalize rounded transition-all ${
                  period === p ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {p === 'ano' ? 'Año' : p === 'dia' ? 'Día' : p}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 border-l border-border pl-2">
            <button onClick={handlePrev} className="p-1 hover:bg-gray-100 rounded text-text-secondary">
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-semibold text-text-primary sm:min-w-[140px] text-center px-2">
              {getPeriodLabel()}
            </span>
            <button onClick={handleNext} className="p-1 hover:bg-gray-100 rounded text-text-secondary">
              <ChevronRight size={16} />
            </button>
            {offset !== 0 && (
              <button onClick={handleReset} className="p-1 hover:bg-gray-100 rounded text-text-muted" title="Regresar al periodo actual">
                <RefreshCw size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatsCard
          title="Ventas del periodo"
          value={formatCurrency(stats.ventas_rango)}
          icon={<DollarSign size={20} />}
          variant="success"
        />
        <StatsCard
          title="Ganancia neta"
          value={formatCurrency(stats.ganancia_rango)}
          icon={<TrendingUp size={20} />}
          variant="success"
        />
        <StatsCard
          title="Valor de Inventario"
          value={formatCurrency(stats.valor_inventario)}
          icon={<Package size={20} />}
        />
        <StatsCard
          title="Stock total"
          value={formatNumber(stats.stock_total)}
          icon={<Package size={20} />}
        />
        <StatsCard
          title="Devoluciones"
          value={formatNumber(stats.total_devoluciones)}
          icon={<AlertTriangle size={20} />}
          variant="danger"
        />
        <StatsCard
          title="Stock bajo"
          value={stats.productos_stock_bajo}
          icon={<AlertTriangle size={20} />}
          variant={stats.productos_stock_bajo > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Tendencia de Ventas en el Periodo</h3>
          <div className="h-64">
            <Bar
              data={barChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 } } },
                  x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                },
              }}
            />
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg border border-border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Top 5 más vendidos</h3>
          {stats.top_productos.length > 0 ? (
            <div className="h-64 flex items-center justify-center">
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 }, padding: 8 } },
                  },
                  cutout: '60%',
                }}
              />
            </div>
          ) : (
            <p className="text-xs text-text-muted text-center py-12">Sin datos de ventas en este periodo</p>
          )}
        </div>
      </div>

      {/* Alerts and movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Stock Alerts */}
        <div className="bg-white rounded-lg border border-border shadow-sm flex flex-col h-[340px]">
          <div className="px-5 py-3 border-b border-border flex-shrink-0 flex justify-between items-center bg-surface/10">
            <h3 className="text-sm font-semibold text-text-primary">Alertas de stock bajo</h3>
            <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded font-semibold">{stats.productos_stock_bajo} productos</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {stats.productos_stock_bajo_lista.length > 0 ? (
              <ul className="divide-y divide-border">
                {stats.productos_stock_bajo_lista.map((p: any) => (
                  <li key={p.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{p.nombre}</p>
                      <p className="text-xs text-text-muted font-mono">{p.codigo}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                        Existencia: {p.stock_actual} / Mínimo: {p.stock_minimo}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-sm text-text-muted text-center">Sin alertas</p>
            )}
          </div>
        </div>

        {/* Recent Movements */}
        <div className="bg-white rounded-lg border border-border shadow-sm flex flex-col h-[340px]">
          <div className="px-5 py-3 border-b border-border flex-shrink-0 bg-surface/10">
            <h3 className="text-sm font-semibold text-text-primary">Últimos movimientos</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {stats.ultimos_movimientos.length > 0 ? (
              <ul className="divide-y divide-border">
                {stats.ultimos_movimientos.map((m: any) => (
                  <li key={m.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{m.producto}</p>
                      <p className="text-xs text-text-muted">{m.usuario} - {formatDateTime(m.fecha_movimiento)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${tipoMovimientoColor(m.tipo_movimiento)}`}>
                        {tipoMovimientoLabel(m.tipo_movimiento)}
                      </span>
                      <span className="text-sm font-medium tabular-nums">{m.cantidad}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-sm text-text-muted text-center">Sin movimientos recientes</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
