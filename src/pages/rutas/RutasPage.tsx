import { useEffect, useState, useCallback } from 'react';
import { Plus, Eye, CheckCircle, Package, XCircle, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';
import type { CargaVendedor, Producto, User } from '../../types';
import Modal from '../../components/ui/Modal';
import { formatDate, formatCurrency, estadoCargaColor, toLocalDateString } from '../../utils/formatters';
import { handleIntegerKeyDown } from '../../utils/keyboard';
import ClearFiltersButton from '../../components/ui/ClearFiltersButton';

export default function RutasPage() {
  const [cargas, setCargas] = useState<CargaVendedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [vendedores, setVendedores] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [createModal, setCreateModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedCarga, setSelectedCarga] = useState<CargaVendedor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [cargaToCancel, setCargaToCancel] = useState<number | null>(null);

  // Filters & Page Size States
  const [vendedorFilter, setVendedorFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [fechaFilter, setFechaFilter] = useState('');
  const [perPage, setPerPage] = useState(25);

  // Create form
  const [newCarga, setNewCarga] = useState({
    usuario_id: '',
    fecha: toLocalDateString(),
    observaciones: '',
    detalles: [] as { producto_id: string; cantidad_salida: string }[],
  });

  // Close form - only user input is cantidad_devuelta
  const [cierreDetalles, setCierreDetalles] = useState<{ detalle_id: number; cantidad_devuelta: string }[]>([]);

  const load = useCallback(async (page = 1, limit = perPage, vendId = vendedorFilter, est = estadoFilter, fec = fechaFilter) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: limit };
      if (vendId) params.usuario_id = vendId;
      if (est) params.estado = est;
      if (fec) params.fecha = fec;
      const r = await api.get('/cargas', { params });
      setCargas(r.data.data);
      setPagination({ currentPage: r.data.current_page, lastPage: r.data.last_page, total: r.data.total });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [perPage, vendedorFilter, estadoFilter, fechaFilter]);

  useEffect(() => {
    load(1);
  }, [load]);

  useEffect(() => {
    api.get('/productos', { params: { per_page: 1000 } }).then(r => setProductos(r.data.data || r.data));
    api
      .get('/users', { params: { role_id: 3 } })
      .then(r => setVendedores(r.data))
      .catch(() => api.get('/users').then(r => setVendedores(r.data)));
  }, []);

  const addProductoRow = () => {
    setNewCarga({ ...newCarga, detalles: [...newCarga.detalles, { producto_id: '', cantidad_salida: '' }] });
  };

  const removeProductoRow = (i: number) => {
    setNewCarga({ ...newCarga, detalles: newCarga.detalles.filter((_, idx) => idx !== i) });
  };

  const updateDetalle = (i: number, field: string, value: string) => {
    const d = [...newCarga.detalles];
    (d[i] as Record<string, string>)[field] = value;

    if (field === 'producto_id' && value !== '') {
      const duplicateIndex = d.findIndex((item, idx) => item.producto_id === value && idx !== i);
      if (duplicateIndex !== -1) {
        const qty1 = parseInt(d[duplicateIndex].cantidad_salida || '0');
        const qty2 = parseInt(d[i].cantidad_salida || '0') || 1;
        d[duplicateIndex].cantidad_salida = String(qty1 + qty2);
        const filtered = d.filter((_, idx) => idx !== i);
        setNewCarga({ ...newCarga, detalles: filtered });
        return;
      }
    }
    setNewCarga({ ...newCarga, detalles: d });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/cargas', {
        ...newCarga,
        detalles: newCarga.detalles.map(d => ({
          producto_id: parseInt(d.producto_id),
          cantidad_salida: parseInt(d.cantidad_salida),
        })),
      });
      setCreateModal(false);
      load();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      alert(ax.response?.data?.message || 'Error al crear carga');
    } finally {
      setSubmitting(false);
    }
  };

  const openCerrar = (carga: CargaVendedor) => {
    setSelectedCarga(carga);
    setCierreDetalles(carga.detalles.map(d => ({ detalle_id: d.id, cantidad_devuelta: '0' })));
    setCloseModal(true);
  };

  const handleCerrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = cierreDetalles.map(c => {
        const originalDetalle = selectedCarga!.detalles.find(d => d.id === c.detalle_id)!;
        const devuelta = parseInt(c.cantidad_devuelta) || 0;
        const vendida = Math.max(0, originalDetalle.cantidad_salida - devuelta);
        return {
          detalle_id: c.detalle_id,
          cantidad_vendida: vendida,
          cantidad_devuelta: devuelta,
        };
      });

      await api.post(`/cargas/${selectedCarga!.id}/cerrar`, { detalles: payload });
      setCloseModal(false);
      load();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      alert(ax.response?.data?.message || 'Error al cerrar carga');
    } finally {
      setSubmitting(false);
    }
  };

  const openCancelar = (id: number) => {
    setCargaToCancel(id);
    setCancelModal(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Rutas del dia</h1>
        <button
          onClick={() => {
            setNewCarga({
              usuario_id: '',
              fecha: toLocalDateString(),
              observaciones: '',
              detalles: [],
            });
            setCreateModal(true);
          }}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover transition-colors"
        >
          <Plus size={16} /> Nueva carga
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-lg border border-border flex-wrap">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-auto">
            <select
              value={vendedorFilter}
              onChange={e => {
                setVendedorFilter(e.target.value);
                load(1, perPage, e.target.value, estadoFilter, fechaFilter);
              }}
              className="w-full sm:w-auto pl-3 pr-8 py-1.5 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary sm:min-w-[160px]"
            >
              <option value="">Todos los vendedores</option>
              {vendedores.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-auto">
            <select
              value={estadoFilter}
              onChange={e => {
                setEstadoFilter(e.target.value);
                load(1, perPage, vendedorFilter, e.target.value, fechaFilter);
              }}
              className="w-full sm:w-auto pl-3 pr-8 py-1.5 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary sm:min-w-[120px]"
            >
              <option value="">Todos los estados</option>
              <option value="abierta">Abiertas</option>
              <option value="cerrada">Cerradas</option>
            </select>
          </div>
          <div className="w-full sm:w-auto">
            <input
              type="date"
              value={fechaFilter}
              onChange={e => {
                setFechaFilter(e.target.value);
                load(1, perPage, vendedorFilter, estadoFilter, e.target.value);
              }}
              className="w-full sm:w-auto px-3 py-1.5 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="w-full sm:w-auto flex justify-end">
            <ClearFiltersButton
              visible={!!(vendedorFilter || estadoFilter || fechaFilter)}
              onClick={() => {
                setVendedorFilter('');
                setEstadoFilter('');
                setFechaFilter('');
                load(1, perPage, '', '', '');
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
              load(1, Number(e.target.value), vendedorFilter, estadoFilter, fechaFilter);
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
            <tr className="border-b border-border bg-surface">
              <th className="px-4 py-3 text-left font-semibold text-text-secondary">ID</th>
              <th className="px-4 py-3 text-left font-semibold text-text-secondary">Fecha</th>
              <th className="px-4 py-3 text-left font-semibold text-text-secondary">Vendedor</th>
              <th className="px-4 py-3 text-center font-semibold text-text-secondary">Productos</th>
              <th className="px-4 py-3 text-center font-semibold text-text-secondary">Estado</th>
              <th className="px-4 py-3 text-right font-semibold text-text-secondary">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-3">
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                </td>
              </tr>
            ) : cargas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-text-muted">
                  No hay cargas registradas.
                </td>
              </tr>
            ) : (
              cargas.map(c => (
                <tr key={c.id} className="border-b border-border hover:bg-surface/50">
                  <td className="px-4 py-3 font-mono text-xs">#{c.id}</td>
                  <td className="px-4 py-3">{formatDate(c.fecha)}</td>
                  <td className="px-4 py-3 font-medium">{c.usuario?.name}</td>
                  <td className="px-4 py-3 text-center tabular-nums">{c.detalles?.length || 0}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${estadoCargaColor(c.estado)}`}>
                    {c.estado === 'abierta' ? 'Abierta' : c.estado === 'cerrada' ? 'Cerrada' : 'Cancelada'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right flex justify-end gap-1.5">
                    {c.estado === 'abierta' && (
                      <>
                        <button
                          onClick={() => openCerrar(c)}
                          className="p-1.5 text-text-muted hover:text-success rounded transition-colors"
                          title="Cerrar carga"
                        >
                          <CheckCircle size={15} />
                        </button>
                        <button
                          onClick={() => openCancelar(c.id)}
                          className="p-1.5 text-text-muted hover:text-danger rounded transition-colors"
                          title="Cancelar carga"
                        >
                          <XCircle size={15} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={async () => {
                        const r = await api.get(`/cargas/${c.id}`);
                        setSelectedCarga(r.data);
                        setDetailModal(true);
                      }}
                      className="p-1.5 text-text-muted hover:text-primary rounded transition-colors"
                      title="Ver detalle"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.lastPage > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-white flex-wrap gap-2 rounded-lg">
          <div className="text-xs text-text-secondary">
            Mostrando página <span className="font-semibold">{pagination.currentPage}</span> de{' '}
            <span className="font-semibold">{pagination.lastPage}</span> ({pagination.total} registros)
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

      {/* Create Carga Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Nueva carga de vendedor" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Vendedor *</label>
              <select
                value={newCarga.usuario_id}
                onChange={e => setNewCarga({ ...newCarga, usuario_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white"
                required
              >
                <option value="">Seleccionar</option>
                {vendedores.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Fecha *</label>
              <input
                type="date"
                value={newCarga.fecha}
                onChange={e => setNewCarga({ ...newCarga, fecha: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-md"
                required
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text-primary">Productos</label>
              <button
                type="button"
                onClick={addProductoRow}
                className="text-xs text-primary hover:text-primary-hover font-medium"
              >
                + Agregar producto
              </button>
            </div>
            {newCarga.detalles.map((d, i) => {
              const selectedProd = productos.find(p => String(p.id) === d.producto_id);
              return (
                <div key={i} className="flex items-center gap-2 mb-2 p-2 bg-surface rounded-lg border border-border">
                  <div className="w-9 h-9 rounded bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
                    {selectedProd?.imagen_url ? (
                      <img src={selectedProd.imagen_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package size={15} className="text-text-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <select
                      value={d.producto_id}
                      onChange={e => updateDetalle(i, 'producto_id', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-border rounded bg-white font-medium focus:outline-none focus:ring-1 focus:ring-primary"
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
                  <div className="w-20 flex-shrink-0">
                    <input
                      type="number"
                      min="1"
                      value={d.cantidad_salida}
                      onChange={e => updateDetalle(i, 'cantidad_salida', e.target.value)}
                      onFocus={e => e.target.select()}
                      onKeyDown={handleIntegerKeyDown}
                      placeholder="Cant."
                      className="w-full px-2 py-1.5 text-xs border border-border rounded text-center font-semibold"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeProductoRow(i)}
                    className="text-danger hover:text-red-700 px-2 py-1 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
            {newCarga.detalles.length === 0 && (
              <p className="text-xs text-text-muted py-4 text-center border border-dashed border-border rounded-md bg-surface/50">
                Agrega productos a la carga
              </p>
            )}
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateModal(false)}
              className="px-4 py-2 text-sm border border-border rounded-md hover:bg-surface"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || newCarga.detalles.length === 0}
              className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-60"
            >
              {submitting ? 'Creando...' : 'Crear carga'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Close Carga Modal */}
      <Modal isOpen={closeModal} onClose={() => setCloseModal(false)} title={`Cerrar carga #${selectedCarga?.id}`} size="lg">
        <form onSubmit={handleCerrar} className="space-y-4">
          <p className="text-sm text-text-secondary">
            Vendedor: <strong>{selectedCarga?.usuario?.name}</strong> — Fecha:{' '}
            <strong>{selectedCarga?.fecha ? formatDate(selectedCarga.fecha) : ''}</strong>
          </p>
          <table className="w-full text-sm border border-border rounded-md overflow-hidden">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="px-3 py-2 text-left font-semibold text-text-secondary">Producto</th>
                <th className="px-3 py-2 text-center font-semibold text-text-secondary">Salida</th>
                <th className="px-3 py-2 text-center font-semibold text-text-secondary bg-blue-50/50">Vendida (Autocalculado)</th>
                <th className="px-3 py-2 text-center font-semibold text-text-secondary">Devuelta (Ingresar)</th>
                <th className="px-3 py-2 text-right font-semibold text-text-secondary">Precio</th>
              </tr>
            </thead>
            <tbody>
              {selectedCarga?.detalles.map((d, i) => {
                const devueltaVal = parseInt(cierreDetalles[i]?.cantidad_devuelta) || 0;
                const vendidaAuto = Math.max(0, d.cantidad_salida - devueltaVal);

                return (
                  <tr key={d.id} className="border-b border-border">
                    <td className="px-3 py-2 font-medium">{d.producto?.nombre}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{d.cantidad_salida}</td>
                    <td className="px-3 py-2 text-center font-bold text-primary bg-blue-50/20 tabular-nums">{vendidaAuto}</td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max={d.cantidad_salida}
                        value={cierreDetalles[i]?.cantidad_devuelta || ''}
                        onChange={e => {
                          const cd = [...cierreDetalles];
                          cd[i].cantidad_devuelta = e.target.value;
                          setCierreDetalles(cd);
                        }}
                        onFocus={e => e.target.select()}
                        onKeyDown={handleIntegerKeyDown}
                        placeholder="0"
                        className="w-20 px-2 py-1 text-sm border border-border rounded text-center font-semibold focus:ring-1 focus:ring-primary"
                        required
                      />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(d.precio_venta)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCloseModal(false)}
              className="px-4 py-2 text-sm border border-border rounded-md hover:bg-surface"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-success text-white rounded-md hover:bg-green-700 disabled:opacity-60 font-semibold"
            >
              {submitting ? 'Cerrando...' : 'Cerrar carga'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Carga Detail Modal */}
      <Modal isOpen={detailModal} onClose={() => setDetailModal(false)} title={`Detalle de Carga #${selectedCarga?.id}`} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 p-3 bg-surface rounded-lg border border-border text-sm">
            <div>
              <span className="block text-xs text-text-muted">Vendedor</span>
              <strong className="text-text-primary">{selectedCarga?.usuario?.name}</strong>
            </div>
            <div>
              <span className="block text-xs text-text-muted">Fecha de Carga</span>
              <strong className="text-text-primary">{selectedCarga?.fecha ? formatDate(selectedCarga.fecha) : ''}</strong>
            </div>
            <div>
              <span className="block text-xs text-text-muted">Estado</span>
              <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${selectedCarga ? estadoCargaColor(selectedCarga.estado) : ''}`}>
                {selectedCarga?.estado === 'abierta' ? 'Abierta' : selectedCarga?.estado === 'cerrada' ? 'Cerrada' : 'Cancelada'}
              </span>
            </div>
          </div>

          <table className="w-full text-sm border border-border rounded-md overflow-hidden">
            <thead>
              <tr className="bg-surface border-b border-border text-left">
                <th className="px-3 py-2 font-semibold text-text-secondary">Producto</th>
                <th className="px-3 py-2 text-center font-semibold text-text-secondary">Salida</th>
                <th className="px-3 py-2 text-center font-semibold text-text-secondary">Vendida</th>
                <th className="px-3 py-2 text-center font-semibold text-text-secondary">Devuelta</th>
                <th className="px-3 py-2 text-right font-semibold text-text-secondary">Precio</th>
                <th className="px-3 py-2 text-right font-semibold text-text-secondary">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {selectedCarga?.detalles.map(d => {
                const sub = d.cantidad_vendida * d.precio_venta;
                return (
                  <tr key={d.id} className="border-b border-border">
                    <td className="px-3 py-2 font-medium">{d.producto?.nombre}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{d.cantidad_salida}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{selectedCarga.estado === 'abierta' ? '—' : d.cantidad_vendida}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{selectedCarga.estado === 'abierta' ? '—' : d.cantidad_devuelta}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(d.precio_venta)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {selectedCarga.estado === 'abierta' ? '—' : formatCurrency(sub)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {selectedCarga?.observaciones && (
            <div className="p-3 bg-gray-50 rounded border border-border">
              <span className="block text-xs text-text-muted font-medium mb-1">Observaciones</span>
              <p className="text-xs text-text-secondary">{selectedCarga.observaciones}</p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setDetailModal(false)}
              className="px-4 py-2 text-sm border border-border rounded-md hover:bg-surface"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal isOpen={cancelModal} onClose={() => setCancelModal(false)} title="Confirmar cancelación" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-50 text-red-600 rounded-full flex-shrink-0">
              <AlertTriangle size={20} />
            </div>
            <p className="text-sm text-text-secondary pt-1 leading-relaxed">
              ¿Está seguro de que desea cancelar la carga <strong>#{cargaToCancel}</strong>? Los productos salientes serán devueltos al stock actual inmediatamente.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setCancelModal(false)}
              className="px-4 py-2 text-xs font-semibold border border-border rounded hover:bg-surface"
            >
              No, mantener
            </button>
            <button
              onClick={async () => {
                if (!cargaToCancel) return;
                setSubmitting(true);
                try {
                  await api.post(`/cargas/${cargaToCancel}/cancelar`);
                  setCancelModal(false);
                  load();
                } catch (err: unknown) {
                  const ax = err as { response?: { data?: { message?: string } } };
                  alert(ax.response?.data?.message || 'Error al cancelar carga');
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold bg-danger text-white rounded hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Cancelando...' : 'Sí, cancelar carga'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
