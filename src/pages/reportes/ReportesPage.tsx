import { useState } from 'react';
import { Download, Filter } from 'lucide-react';
import api from '../../api/axios';
import type { ReporteVentas } from '../../types';
import { formatCurrency, toLocalDateString } from '../../utils/formatters';
import ClearFiltersButton from '../../components/ui/ClearFiltersButton';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function ReportesPage() {
  const [ventas, setVentas] = useState<ReporteVentas | null>(null);
  const [ranking, setRanking] = useState<{ vendedor: string; total_vendido: number; total_comision: number; unidades_vendidas: number }[]>([]);
  const [ventasPeriodo, setVentasPeriodo] = useState<{ periodo: string; total_ventas: number; total_ganancia: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({ fecha_inicio: '', fecha_fin: '', vendedor_id: '', producto_id: '', categoria_id: '', periodo: 'diario' });
  const [activeTab, setActiveTab] = useState<'ventas' | 'ranking' | 'grafica'>('ventas');

  const buscar = async () => {
    const todayStr = toLocalDateString();
    if (filtros.fecha_inicio && filtros.fecha_fin && filtros.fecha_inicio > filtros.fecha_fin) {
      alert('La fecha de inicio ("Desde") no puede ser mayor que la fecha de fin ("Hasta").');
      return;
    }
    if (filtros.fecha_fin && filtros.fecha_fin > todayStr) {
      alert('La fecha de fin ("Hasta") no puede ser posterior a la fecha actual.');
      return;
    }
    if (filtros.fecha_inicio && filtros.fecha_inicio > todayStr) {
      alert('La fecha de inicio ("Desde") no puede ser posterior a la fecha actual.');
      return;
    }

    setLoading(true);
    try {
      const params: Record<string, string> = {};
      Object.entries(filtros).forEach(([k, v]) => { if (v) params[k] = v; });

      const [ventasRes, rankingRes, periodoRes] = await Promise.all([
        api.get('/reportes/ventas', { params }),
        api.get('/reportes/ranking-vendedores', { params: { fecha_inicio: filtros.fecha_inicio, fecha_fin: filtros.fecha_fin } }),
        api.get('/reportes/ventas-periodo', { params: { periodo: filtros.periodo, fecha_inicio: filtros.fecha_inicio, fecha_fin: filtros.fecha_fin } }),
      ]);

      setVentas(ventasRes.data);
      setRanking(rankingRes.data);
      setVentasPeriodo(periodoRes.data);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  const exportarExcel = async () => {
    try {
      const response = await api.get('/reportes/exportar-excel', {
        params: filtros,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_ventas_${toLocalDateString()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error(e);
      alert('Error al exportar archivo Excel.');
    }
  };

  const chartData = {
    labels: ventasPeriodo.map(v => v.periodo),
    datasets: [
      { label: 'Ventas', data: ventasPeriodo.map(v => v.total_ventas), backgroundColor: '#2563EB', borderRadius: 4 },
      { label: 'Ganancia', data: ventasPeriodo.map(v => v.total_ganancia), backgroundColor: '#16A34A', borderRadius: 4 },
    ],
  };

  const tabs = [
    { key: 'ventas', label: 'Detalle de ventas' },
    { key: 'ranking', label: 'Ranking vendedores' },
    { key: 'grafica', label: 'Ventas por periodo' },
  ] as const;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-text-primary">Reportes y estadisticas</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-border p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div><label className="block text-xs font-medium text-text-secondary mb-1">Desde</label>
            <input type="date" max={toLocalDateString()} value={filtros.fecha_inicio} onChange={e => setFiltros({...filtros, fecha_inicio: e.target.value})} className="px-3 py-2 text-sm border border-border rounded-md"/></div>
          <div><label className="block text-xs font-medium text-text-secondary mb-1">Hasta</label>
            <input type="date" max={toLocalDateString()} value={filtros.fecha_fin} onChange={e => setFiltros({...filtros, fecha_fin: e.target.value})} className="px-3 py-2 text-sm border border-border rounded-md"/></div>
          <div><label className="block text-xs font-medium text-text-secondary mb-1">Periodo</label>
            <select value={filtros.periodo} onChange={e => setFiltros({...filtros, periodo: e.target.value})} className="px-3 py-2 text-sm border border-border rounded-md">
              <option value="diario">Diario</option><option value="semanal">Semanal</option><option value="mensual">Mensual</option>
            </select></div>
          <button onClick={buscar} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover disabled:opacity-60">
            <Filter size={14}/> {loading ? 'Cargando...' : 'Filtrar'}
          </button>
          <ClearFiltersButton
            visible={!!(filtros.fecha_inicio || filtros.fecha_fin || filtros.vendedor_id || filtros.producto_id || filtros.categoria_id)}
            onClick={() => {
              setFiltros({ fecha_inicio: '', fecha_fin: '', vendedor_id: '', producto_id: '', categoria_id: '', periodo: 'diario' });
              setVentas(null);
              setRanking([]);
              setVentasPeriodo([]);
            }}
          />
          {ventas && <button onClick={exportarExcel} className="flex items-center gap-2 px-4 py-2 border border-border text-sm font-medium rounded-md hover:bg-surface">
            <Download size={14}/> Exportar Excel
          </button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(t => <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>{t.label}</button>)}
      </div>

      {/* Content */}
      {activeTab === 'ventas' && ventas && (
        <div className="bg-white rounded-lg border border-border shadow-sm overflow-x-auto">
          <table className="w-full text-sm"><thead><tr className="border-b border-border bg-surface">
            <th className="px-3 py-2 text-left font-semibold text-text-secondary">Producto</th>
            <th className="px-3 py-2 text-left font-semibold text-text-secondary">Vendedor</th>
            <th className="px-3 py-2 text-right font-semibold text-text-secondary">Vendido</th>
            <th className="px-3 py-2 text-right font-semibold text-text-secondary">Precio</th>
            <th className="px-3 py-2 text-right font-semibold text-text-secondary">Subtotal</th>
            <th className="px-3 py-2 text-right font-semibold text-text-secondary">Inversion</th>
            <th className="px-3 py-2 text-right font-semibold text-text-secondary">Pago vendedor</th>
            <th className="px-3 py-2 text-right font-semibold text-text-secondary">Sobrante</th>
            <th className="px-3 py-2 text-right font-semibold text-text-secondary">Ganancia</th>
          </tr></thead>
          <tbody>
            {ventas.detalles.map((d, i) => (
              <tr key={i} className="border-b border-border hover:bg-surface/50">
                <td className="px-3 py-2 font-medium">{d.producto}</td>
                <td className="px-3 py-2">{d.vendedor}</td>
                <td className="px-3 py-2 text-right tabular-nums">{d.cantidad_vendida}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(d.precio_venta)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(d.subtotal)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(d.inversion)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(d.pago_vendedor)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{d.sobrante}</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatCurrency(d.ganancia)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="bg-surface font-semibold">
            <td className="px-3 py-2" colSpan={2}>Totales</td>
            <td className="px-3 py-2 text-right tabular-nums">{ventas.totales.total_unidades_vendidas}</td>
            <td className="px-3 py-2"></td>
            <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(ventas.totales.total_vendido)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(ventas.totales.total_inversion)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(ventas.totales.total_pago_vendedor)}</td>
            <td className="px-3 py-2"></td>
            <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(ventas.totales.total_ganancia)}</td>
          </tr></tfoot></table>
        </div>
      )}

      {activeTab === 'ranking' && ranking.length > 0 && (
        <div className="bg-white rounded-lg border border-border shadow-sm overflow-x-auto">
          <table className="w-full text-sm"><thead><tr className="border-b border-border bg-surface">
            <th className="px-4 py-3 text-center font-semibold text-text-secondary w-12">#</th>
            <th className="px-4 py-3 text-left font-semibold text-text-secondary">Vendedor</th>
            <th className="px-4 py-3 text-right font-semibold text-text-secondary">Total vendido</th>
            <th className="px-4 py-3 text-right font-semibold text-text-secondary">Comision</th>
            <th className="px-4 py-3 text-right font-semibold text-text-secondary">Unidades</th>
          </tr></thead><tbody>
            {ranking.map((r, i) => (
              <tr key={i} className="border-b border-border hover:bg-surface/50">
                <td className="px-4 py-3 text-center font-semibold">{i + 1}</td>
                <td className="px-4 py-3 font-medium">{r.vendedor}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(r.total_vendido)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(r.total_comision)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.unidades_vendidas}</td>
              </tr>
            ))}
          </tbody></table>
        </div>
      )}

      {activeTab === 'grafica' && ventasPeriodo.length > 0 && (
        <div className="bg-white rounded-lg border border-border p-5 shadow-sm">
          <div className="h-80">
            <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, grid: { color: '#F1F5F9' } }, x: { grid: { display: false } } } }} />
          </div>
        </div>
      )}

      {!ventas && !loading && <p className="text-center text-text-muted py-12">Selecciona un rango de fechas y presiona Filtrar para ver los reportes.</p>}
    </div>
  );
}
