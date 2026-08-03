import { useEffect, useState, useCallback } from 'react';
import { Plus, Check, Search, Filter, AlertTriangle, Settings, Zap } from 'lucide-react';
import api from '../../api/axios';
import type { LiquidacionVendedor, Vendedor } from '../../types';
import Modal from '../../components/ui/Modal';
import { formatDate, formatCurrency, estadoLiquidacionColor, toLocalDateString } from '../../utils/formatters';
import ClearFiltersButton from '../../components/ui/ClearFiltersButton';

const getWeekRange = () => {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(today.setDate(diff));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: toLocalDateString(start),
    end: toLocalDateString(end),
  };
};

export default function LiquidacionesPage() {
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionVendedor[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ vendedor_id: '', fecha_inicio: '', fecha_fin: '' });
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0 });

  // Payout confirmation modal state
  const [payoutLiq, setPayoutLiq] = useState<LiquidacionVendedor | null>(null);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);

  // Settings: Day of automatic liquidation
  const [diaLiquidacion, setDiaLiquidacion] = useState('5'); // Default: Viernes (5)
  const [savingSettings, setSavingSettings] = useState(false);

  // Filters & Page Size States
  const [vendedorFilter, setVendedorFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [fechaInicioFilter, setFechaInicioFilter] = useState(getWeekRange().start);
  const [fechaFinFilter, setFechaFinFilter] = useState(getWeekRange().end);
  const [perPage, setPerPage] = useState(25);

  const load = useCallback(async (
    page = 1,
    limit = perPage,
    vendId = vendedorFilter,
    est = estadoFilter,
    fInicio = fechaInicioFilter,
    fFin = fechaFinFilter
  ) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: limit };
      if (vendId) params.vendedor_id = vendId;
      if (est) params.estado = est;
      if (fInicio) params.fecha_inicio = fInicio;
      if (fFin) params.fecha_fin = fFin;
      const r = await api.get('/liquidaciones', { params });
      setLiquidaciones(r.data.data);
      setPagination({ currentPage: r.data.current_page, lastPage: r.data.last_page, total: r.data.total });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [perPage, vendedorFilter, estadoFilter, fechaInicioFilter, fechaFinFilter]);

  const loadSettings = async () => {
    try {
      const res = await api.get('/configuraciones/dia_liquidacion_semanal');
      if (res.data && res.data.valor) {
        setDiaLiquidacion(res.data.valor);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load(1);
    loadSettings();
    api.get('/vendedores').then(r => setVendedores(r.data));
  }, [load]);

  const handleGenerar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/liquidaciones/generar', { ...form, vendedor_id: parseInt(form.vendedor_id) });
      setModalOpen(false);
      load(1);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      alert(ax.response?.data?.message || 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerarEmergencia = async () => {
    if (!form.vendedor_id) {
      alert('Por favor selecciona un vendedor.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/liquidaciones/generar-emergencia', { vendedor_id: parseInt(form.vendedor_id) });
      alert('Liquidación de urgencia generada con éxito.');
      setModalOpen(false);
      load(1);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      alert(ax.response?.data?.message || 'Error al generar liquidación de urgencia.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmPayout = (liq: LiquidacionVendedor) => {
    setPayoutLiq(liq);
    setPayoutModalOpen(true);
  };

  const handlePagar = async () => {
    if (!payoutLiq) return;
    setPayoutSubmitting(true);
    try {
      await api.patch(`/liquidaciones/${payoutLiq.id}/pagar`);
      setPayoutModalOpen(false);
      load(pagination.currentPage);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      alert(ax.response?.data?.message || 'Error');
    } finally {
      setPayoutSubmitting(false);
    }
  };

  const handleSaveSettings = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDiaLiquidacion(val);
    setSavingSettings(true);
    try {
      await api.put('/configuraciones', { clave: 'dia_liquidacion_semanal', valor: val });
    } catch (err) {
      console.error(err);
      alert('Error al guardar configuración.');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Widget */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Liquidaciones y Pagos</h1>
          <p className="text-xs text-text-secondary">Control de salarios y comisiones ganadas por vendedores</p>
        </div>

        <div className="flex gap-2">
          {/* Settings Inline widget */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-border shadow-sm text-xs">
            <Settings size={14} className="text-text-muted" />
            <span className="font-medium text-text-secondary">Corte Automático:</span>
            <select
              value={diaLiquidacion}
              onChange={handleSaveSettings}
              disabled={savingSettings}
              className="bg-gray-50 border border-border rounded px-1.5 py-0.5 font-semibold text-primary focus:outline-none disabled:opacity-50"
            >
              <option value="1">Lunes</option>
              <option value="2">Martes</option>
              <option value="3">Miércoles</option>
              <option value="4">Jueves</option>
              <option value="5">Viernes</option>
              <option value="6">Sábado</option>
              <option value="7">Domingo</option>
            </select>
          </div>

          <button
            onClick={() => {
              setForm({ vendedor_id: '', fecha_inicio: '', fecha_fin: '' });
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-white text-xs font-semibold rounded-md hover:bg-primary-hover shadow-sm transition-colors"
          >
            <Plus size={14} /> Generar Pago / Liquidación
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-lg border border-border flex-wrap shadow-sm">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-auto">
            <select
              value={vendedorFilter}
              onChange={e => {
                setVendedorFilter(e.target.value);
                load(1, perPage, e.target.value, estadoFilter, fechaInicioFilter, fechaFinFilter);
              }}
              className="w-full sm:w-auto pl-3 pr-8 py-1.5 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary sm:min-w-[160px]"
            >
              <option value="">Todos los vendedores</option>
              {vendedores.map(v => (
                <option key={v.id} value={v.id}>
                  {v.usuario?.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-auto">
            <select
              value={estadoFilter}
              onChange={e => {
                setEstadoFilter(e.target.value);
                load(1, perPage, vendedorFilter, e.target.value, fechaInicioFilter, fechaFinFilter);
              }}
              className="w-full sm:w-auto pl-3 pr-8 py-1.5 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary sm:min-w-[120px]"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="pagado">Pagados</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-xs text-text-secondary font-medium">Desde:</span>
            <input
              type="date"
              value={fechaInicioFilter}
              onChange={e => {
                setFechaInicioFilter(e.target.value);
                load(1, perPage, vendedorFilter, estadoFilter, e.target.value, fechaFinFilter);
              }}
              className="w-full sm:w-auto px-3 py-1.5 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-xs text-text-secondary font-medium">Hasta:</span>
            <input
              type="date"
              value={fechaFinFilter}
              onChange={e => {
                setFechaFinFilter(e.target.value);
                load(1, perPage, vendedorFilter, estadoFilter, fechaInicioFilter, e.target.value);
              }}
              className="w-full sm:w-auto px-3 py-1.5 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="w-full sm:w-auto flex justify-end">
            <ClearFiltersButton
              visible={
                !!(
                  vendedorFilter ||
                  estadoFilter ||
                  fechaInicioFilter !== getWeekRange().start ||
                  fechaFinFilter !== getWeekRange().end
                )
              }
              onClick={() => {
                const range = getWeekRange();
                setVendedorFilter('');
                setEstadoFilter('');
                setFechaInicioFilter(range.start);
                setFechaFinFilter(range.end);
                load(1, perPage, '', '', range.start, range.end);
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-text-secondary">Filas por página:</span>
          <select
            value={perPage}
            onChange={e => {
              setPerPage(Number(e.target.value));
              load(1, Number(e.target.value), vendedorFilter, estadoFilter);
            }}
            className="px-2.5 py-1.5 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left">
              <th className="px-4 py-3 font-semibold text-text-secondary">Vendedor</th>
              <th className="px-4 py-3 font-semibold text-text-secondary">Periodo</th>
              <th className="px-4 py-3 text-right font-semibold text-text-secondary">Total vendido</th>
              <th className="px-4 py-3 text-right font-semibold text-text-secondary">Comisión</th>
              <th className="px-4 py-3 text-right font-semibold text-text-secondary">Salario base</th>
              <th className="px-4 py-3 text-right font-semibold text-text-secondary">Deuda desc.</th>
              <th className="px-4 py-3 text-right font-semibold text-text-secondary">Total a pagar</th>
              <th className="px-4 py-3 text-center font-semibold text-text-secondary">Estado</th>
              <th className="px-4 py-3 text-center font-semibold text-text-secondary">Pagar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-text-muted">
                  Cargando liquidaciones...
                </td>
              </tr>
            ) : liquidaciones.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-text-muted">
                  No se encontraron liquidaciones.
                </td>
              </tr>
            ) : (
              liquidaciones.map(l => (
                <tr key={l.id} className="border-b border-border hover:bg-surface/50">
                  <td className="px-4 py-3 font-medium text-text-primary">{l.vendedor?.usuario?.name}</td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {formatDate(l.fecha_inicio)} — {formatDate(l.fecha_fin)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(l.total_vendido)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-primary">{formatCurrency(l.total_comision)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-success">{formatCurrency(l.salario_pagado)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-danger font-semibold">{l.deuda ? formatCurrency(l.deuda) : '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-text-primary">{formatCurrency(l.total_pagado)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${estadoLiquidacionColor(l.estado)}`}>
                      {l.estado === 'pendiente' ? 'Pendiente' : 'Pagado'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {l.estado === 'pendiente' ? (
                      <button
                        onClick={() => confirmPayout(l)}
                        className="px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded border border-green-200 transition-colors"
                        title="Registrar pago"
                      >
                        Pagar
                      </button>
                    ) : (
                      <span className="text-xs text-text-muted font-semibold">Listo</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Server-side Pagination Footer */}
        {!loading && pagination.lastPage > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-surface/30 flex-wrap gap-2">
            <div className="text-xs text-text-secondary">
              Mostrando página <span className="font-semibold">{pagination.currentPage}</span> de{' '}
              <span className="font-semibold">{pagination.lastPage}</span>
            </div>
            <div className="flex gap-1">
              <button
                disabled={pagination.currentPage <= 1}
                onClick={() => load(pagination.currentPage - 1)}
                className="px-2.5 py-1 text-xs font-medium border border-border rounded hover:bg-surface bg-white disabled:opacity-40"
              >
                Anterior
              </button>
              {Array.from({ length: pagination.lastPage }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => load(idx + 1)}
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
                disabled={pagination.currentPage >= pagination.lastPage}
                onClick={() => load(pagination.currentPage + 1)}
                className="px-2.5 py-1 text-xs font-medium border border-border rounded hover:bg-surface bg-white disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual and Emergency Liquidation Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Generar Liquidación Manual / Urgencia" size="md">
        <form onSubmit={handleGenerar} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Vendedor *</label>
            <select
              value={form.vendedor_id}
              onChange={e => setForm({ ...form, vendedor_id: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-border rounded-md bg-white focus:outline-none"
              required
            >
              <option value="">Seleccionar vendedor</option>
              {vendedores.map(v => (
                <option key={v.id} value={v.id}>
                  {v.usuario?.name} ({v.usuario?.username})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-2">
            <div className="flex gap-1.5 items-center font-bold">
              <Zap size={14} className="text-amber-600 flex-shrink-0" />
              <span>¿Pago de Urgencia?</span>
            </div>
            <p>
              El botón de <strong>Urgencia</strong> liquidará todas las ganancias y salarios acumulados del vendedor seleccionado <strong>hasta el día de hoy</strong>.
            </p>
            <p>
              Si el esquema es de <em>Sueldo Fijo</em>, se calculará de manera proporcional a los días transcurridos esta semana (Sueldo base / 5 * día de hoy, con lunes = 1).
            </p>
            <button
              type="button"
              disabled={submitting || !form.vendedor_id}
              onClick={handleGenerarEmergencia}
              className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded shadow-sm text-[10px] transition-colors disabled:opacity-50"
            >
              Generar Pago de Urgencia
            </button>
          </div>

          <div className="border-t border-border pt-3">
            <h4 className="text-xs font-bold text-text-secondary mb-2">O Generar para un Rango Específico</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-text-secondary mb-1">Desde *</label>
                <input
                  type="date"
                  value={form.fecha_inicio}
                  onChange={e => setForm({ ...form, fecha_inicio: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-border rounded-md focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-text-secondary mb-1">Hasta *</label>
                <input
                  type="date"
                  value={form.fecha_fin}
                  onChange={e => setForm({ ...form, fecha_fin: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-border rounded-md focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-3 py-1.5 text-xs border border-border rounded-md hover:bg-surface"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !form.fecha_inicio || !form.fecha_fin}
              className="px-3 py-1.5 text-xs bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Generando...' : 'Generar Rango'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Payout Confirmation Modal */}
      <Modal isOpen={payoutModalOpen} onClose={() => setPayoutModalOpen(false)} title="Confirmación de Pago" size="sm">
        {payoutLiq && (
          <div className="space-y-4 text-xs">
            <div className="flex flex-col items-center justify-center p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
              <span className="text-[10px] uppercase font-bold tracking-wider">Cantidad Neta a Recibir</span>
              <strong className="text-xl font-bold mt-1">{formatCurrency(payoutLiq.total_pagado)}</strong>
            </div>

            <div className="space-y-2 border border-border rounded-lg p-3 bg-surface/30">
              <div className="flex justify-between">
                <span className="text-text-secondary">Vendedor:</span>
                <span className="font-semibold text-text-primary">{payoutLiq.vendedor?.usuario?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Periodo liquidado:</span>
                <span className="font-semibold text-text-primary">{formatDate(payoutLiq.fecha_inicio)} al {formatDate(payoutLiq.fecha_fin)}</span>
              </div>
              <div className="flex justify-between border-t border-dashed border-border pt-1.5 mt-1.5">
                <span className="text-text-secondary">Comisiones acumuladas:</span>
                <span className="font-semibold text-primary">{formatCurrency(payoutLiq.total_comision)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Sueldo Base:</span>
                <span className="font-semibold text-success">{formatCurrency(payoutLiq.salario_pagado)}</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800 flex gap-2">
              <AlertTriangle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Nota informativa:</p>
                <p>Las comisiones ya están consideradas en las ganancias totales de la empresa. El salario fijo será deducido de las utilidades.</p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setPayoutModalOpen(false)}
                className="px-4 py-2 border border-border rounded hover:bg-surface font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={payoutSubmitting}
                onClick={handlePagar}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold transition-colors disabled:opacity-50"
              >
                {payoutSubmitting ? 'Procesando...' : 'Confirmar y Pagar'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
