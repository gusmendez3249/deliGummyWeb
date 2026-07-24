import { useEffect, useState, useCallback } from 'react';
import { Plus, Package, AlertTriangle, Calendar } from 'lucide-react';
import api from '../../api/axios';
import type { MovimientoInventario, Producto } from '../../types';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { formatDateTime, tipoMovimientoLabel, tipoMovimientoColor, formatCurrency, toLocalDateString } from '../../utils/formatters';
import { handleIntegerKeyDown } from '../../utils/keyboard';
import ClearFiltersButton from '../../components/ui/ClearFiltersButton';

// Start of current week helper (Monday)
const getStartOfWeek = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  return toLocalDateString(start);
};

// End of current week helper (Sunday)
const getEndOfWeek = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return toLocalDateString(end);
};

export default function InventarioPage() {
  const [activeTab, setActiveTab] = useState<'inventario' | 'movimientos'>('inventario');
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [filterTipo, setFilterTipo] = useState('');
  const [perPageMovimientos, setPerPageMovimientos] = useState(25);

  // Weekly Date Filters for Inventario Tab
  const [fechaInicio, setFechaInicio] = useState(getStartOfWeek());
  const [fechaFin, setFechaFin] = useState(getEndOfWeek());

  const [form, setForm] = useState({ producto_id: '', tipo_movimiento: 'alta', cantidad: '', observaciones: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadMovimientos = useCallback(async (page = 1, limit = perPageMovimientos) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: limit };
      if (filterTipo) params.tipo_movimiento = filterTipo;
      const r = await api.get('/movimientos', { params });
      setMovimientos(r.data.data);
      setPagination({ currentPage: r.data.current_page, lastPage: r.data.last_page, total: r.data.total });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterTipo, perPageMovimientos]);

  const loadProductos = useCallback(async (start = fechaInicio, end = fechaFin) => {
    setLoading(true);
    try {
      const r = await api.get('/productos', {
        params: {
          per_page: 1000,
          fecha_inicio: start,
          fecha_fin: end
        }
      });
      setProductos(r.data.data || r.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin]);

  useEffect(() => {
    if (activeTab === 'movimientos') {
      loadMovimientos();
    } else {
      loadProductos();
    }
  }, [activeTab, loadMovimientos, loadProductos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      await api.post('/movimientos', { ...form, cantidad: parseInt(form.cantidad) });
      setModalOpen(false);
      if (activeTab === 'movimientos') {
        loadMovimientos();
      } else {
        loadProductos();
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      if (ax.response?.data?.errors) {
        const f: Record<string, string> = {};
        Object.entries(ax.response.data.errors).forEach(([k, v]) => { f[k] = v[0]; });
        setErrors(f);
      } else if (ax.response?.data?.message) {
        setErrors({ general: ax.response.data.message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProductos = productos.filter(p => p.activo);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Inventario</h1>
          <p className="text-xs text-text-secondary">Monitoreo de existencias y flujos de mercancía</p>
        </div>
        <button
          onClick={() => {
            setForm({ producto_id: '', tipo_movimiento: 'alta', cantidad: '', observaciones: '' });
            setErrors({});
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-white text-xs font-semibold rounded-md hover:bg-primary-hover shadow-sm transition-colors"
        >
          <Plus size={16} /> Nuevo movimiento
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('inventario')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'inventario'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
        >
          Inventario Semanal
        </button>
        <button
          onClick={() => setActiveTab('movimientos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'movimientos'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
        >
          Historial de Movimientos
        </button>
      </div>

      {activeTab === 'inventario' ? (
        <div className="space-y-4">
          {/* Weekly Period Selector widget */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border border-border shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-text-secondary w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-primary" />
                <span className="font-semibold text-text-primary">Periodo de Ventas/Ganancias:</span>
              </div>
              <div className="flex items-center gap-1.5 sm:ml-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={e => { setFechaInicio(e.target.value); loadProductos(e.target.value, fechaFin); }}
                  className="w-full sm:w-auto px-2 py-1.5 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span>al</span>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={e => { setFechaFin(e.target.value); loadProductos(fechaInicio, e.target.value); }}
                  className="w-full sm:w-auto px-2 py-1.5 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {(fechaInicio !== getStartOfWeek() || fechaFin !== getEndOfWeek()) && (
              <button
                onClick={() => {
                  setFechaInicio(getStartOfWeek());
                  setFechaFin(getEndOfWeek());
                  loadProductos(getStartOfWeek(), getEndOfWeek());
                }}
                className="text-xs text-danger hover:underline font-semibold"
              >
                Restablecer Semana Actual
              </button>
            )}
          </div>

          <div className={`overflow-x-auto border border-slate-300 rounded-lg shadow-sm ${filteredProductos.length > 25 ? 'max-h-[600px] overflow-y-auto' : ''}`}>
            <table className="min-w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-[#3071a9]">
                <tr className="bg-[#3071a9] text-white divide-x divide-slate-400">
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-center text-xs">CANTIDAD</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-left text-xs">PRODUCTO</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-center text-xs">VENDIDO</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-right text-xs">PRECIO</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-right text-xs">SUBTOTAL</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-right text-xs">PAGO VENDEDOR</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-right text-xs">COSTO REAL</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-center text-xs">SOBRANTE</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-right text-xs">INVERSION</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-right text-xs">GANANCIA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-10 text-center text-text-secondary">
                      Cargando inventario...
                    </td>
                  </tr>
                ) : filteredProductos.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-10 text-center text-text-secondary">
                      No hay productos registrados.
                    </td>
                  </tr>
                ) : (
                  filteredProductos.map((p: any) => {
                    const stock = p.stock_actual || 0;
                    // Sum route sales and direct sales
                    const vendido = (Number(p.total_vendido) || 0) + (Number(p.total_vendido_pos) || 0);
                    const cantidad = stock + vendido;
                    const precio = Number(p.precio_venta) || 0;
                    const subtotal = vendido * precio;
                    const pagoVendedor = Number(p.total_comision) || 0;
                    const precioReal = Number(p.costo) || 0;
                    const sobrante = stock;
                    // Inversion = Costo Real * Vendidos
                    const inversion = vendido * precioReal;
                    // Ganancia = subtotal - inversion - pago vendedor
                    const ganancia = subtotal - inversion - pagoVendedor;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 divide-x divide-slate-200">
                        <td className="px-3 py-2 text-center font-mono tabular-nums bg-blue-50/30 text-blue-900 font-semibold">{cantidad}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900 text-left uppercase">{p.nombre}</td>
                        <td className="px-3 py-2 text-center font-mono tabular-nums text-slate-700 bg-amber-50/10">{vendido}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">{formatCurrency(precio)}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">{formatCurrency(subtotal)}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">{formatCurrency(pagoVendedor)}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">{formatCurrency(precioReal)}</td>
                        <td className={`px-3 py-2 text-center font-mono tabular-nums font-semibold ${stock <= p.stock_minimo ? 'text-danger bg-red-50/50' : 'text-slate-700'}`}>
                          {sobrante}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700 bg-amber-50/20">{formatCurrency(inversion)}</td>
                        <td className={`px-3 py-2 text-right font-mono tabular-nums font-bold ${ganancia >= 0 ? 'text-emerald-700 bg-emerald-50/20' : 'text-danger bg-red-50/20'}`}>
                          {formatCurrency(ganancia)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {!loading && filteredProductos.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-bold divide-x divide-slate-300 border-t-2 border-slate-400">
                    <td className="px-3 py-2 text-center font-mono tabular-nums text-blue-900 bg-blue-100/50">
                      {filteredProductos.reduce((acc, p: any) => acc + ((p.stock_actual || 0) + (Number(p.total_vendido) || 0) + (Number(p.total_vendido_pos) || 0)), 0)}
                    </td>
                    <td className="px-3 py-2 text-left uppercase text-xs tracking-wider text-slate-900">TOTALES</td>
                    <td className="px-3 py-2 text-center font-mono tabular-nums text-slate-800 bg-amber-100/30">
                      {filteredProductos.reduce((acc, p: any) => acc + (Number(p.total_vendido) || 0) + (Number(p.total_vendido_pos) || 0), 0)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-400">—</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-900">
                      {formatCurrency(filteredProductos.reduce((acc, p: any) => {
                        const v = (Number(p.total_vendido) || 0) + (Number(p.total_vendido_pos) || 0);
                        return acc + (v * (Number(p.precio_venta) || 0));
                      }, 0))}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-900">
                      {formatCurrency(filteredProductos.reduce((acc, p: any) => acc + (Number(p.total_comision) || 0), 0))}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-400">—</td>
                    <td className="px-3 py-2 text-center font-mono tabular-nums text-slate-900">
                      {filteredProductos.reduce((acc, p: any) => acc + (p.stock_actual || 0), 0)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-900 bg-amber-100/30">
                      {formatCurrency(filteredProductos.reduce((acc, p: any) => {
                        const v = (Number(p.total_vendido) || 0) + (Number(p.total_vendido_pos) || 0);
                        return acc + (v * (Number(p.costo) || 0));
                      }, 0))}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-900">
                      {formatCurrency(filteredProductos.reduce((acc, p: any) => {
                        const v = (Number(p.total_vendido) || 0) + (Number(p.total_vendido_pos) || 0);
                        const sub = v * (Number(p.precio_venta) || 0);
                        const inv = v * (Number(p.costo) || 0);
                        const com = Number(p.total_comision) || 0;
                        return acc + (sub - inv - com);
                      }, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 bg-white p-3 rounded-lg border border-border items-center">
            <div className="w-full sm:w-auto">
              <select
                value={filterTipo}
                onChange={e => setFilterTipo(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 text-sm border border-border rounded bg-white sm:min-w-[150px]"
              >
                <option value="">Todos los tipos</option>
                <option value="alta">Altas</option>
                <option value="baja">Bajas</option>
                <option value="ajuste">Ajustes</option>
                <option value="salida_ruta">Salidas a ruta</option>
                <option value="devolucion_ruta">Devoluciones de ruta</option>
              </select>
            </div>
            <div className="w-full sm:w-auto flex justify-end">
              <ClearFiltersButton visible={!!filterTipo} onClick={() => setFilterTipo('')} />
            </div>
          </div>

          <DataTable
            columns={[
              { key: 'fecha_movimiento', header: 'Fecha', render: (m: MovimientoInventario) => formatDateTime(m.fecha_movimiento) },
              { key: 'producto', header: 'Producto', render: (m: MovimientoInventario) => m.producto?.nombre ?? '—' },
              {
                key: 'tipo_movimiento',
                header: 'Tipo',
                render: (m: MovimientoInventario) => (
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${tipoMovimientoColor(m.tipo_movimiento)}`}>
                    {tipoMovimientoLabel(m.tipo_movimiento)}
                  </span>
                ),
              },
              { key: 'cantidad', header: 'Cantidad', className: 'text-center font-mono' },
              { key: 'usuario', header: 'Usuario', render: (m: MovimientoInventario) => m.usuario?.name ?? '—' },
              { key: 'observaciones', header: 'Observaciones', render: (m: MovimientoInventario) => m.observaciones ?? '—' },
            ]}
            data={movimientos}
            isLoading={loading}
            pagination={{
              currentPage: pagination.currentPage,
              lastPage: pagination.lastPage,
              total: pagination.total,
              onPageChange: loadMovimientos,
              perPage: perPageMovimientos,
              onPerPageChange: (val) => {
                setPerPageMovimientos(val);
                loadMovimientos(1, val);
              }
            }}
          />
        </div>
      )}

      {/* Nuevo movimiento modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Registrar movimiento manual">
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && <p className="text-xs text-danger font-semibold">{errors.general}</p>}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Producto *</label>
            <select
              value={form.producto_id}
              onChange={e => setForm({ ...form, producto_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white"
              required
            >
              <option value="">Seleccionar producto</option>
              {productos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.nombre} (Stock: {p.stock_actual})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Tipo *</label>
              <select
                value={form.tipo_movimiento}
                onChange={e => setForm({ ...form, tipo_movimiento: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white"
              >
                <option value="alta">Alta</option>
                <option value="baja">Baja</option>
                <option value="ajuste">Ajuste</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Cantidad *</label>
              <input
                type="number"
                min="1"
                value={form.cantidad}
                onChange={e => setForm({ ...form, cantidad: e.target.value })}
                onFocus={e => e.target.select()}
                onKeyDown={handleIntegerKeyDown}
                className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Observaciones</label>
            <input
              value={form.observaciones}
              onChange={e => setForm({ ...form, observaciones: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Motivo del movimiento"
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm border border-border rounded-md hover:bg-surface"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-60"
            >
              {submitting ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
