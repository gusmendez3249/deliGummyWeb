import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, ShoppingCart, Calendar, FileText, Search, Package } from 'lucide-react';
import api from '../../api/axios';
import type { Producto, VentaDirecta } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { handleIntegerKeyDown } from '../../utils/keyboard';
import Modal from '../../components/ui/Modal';
import { SectionLoading } from '../../components/ui/TableLoading';
import TableLoading from '../../components/ui/TableLoading';
import { getFriendlyErrorMessage, avisarErrorDeCarga } from '../../utils/friendlyError';

function SafeImage({ src, fallbackIcon }: { src: string | null; fallbackIcon: React.ReactNode }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return <>{fallbackIcon}</>;
  }
  return (
    <img
      src={src}
      onError={() => setError(true)}
      alt=""
      className="w-full h-full object-cover"
      referrerPolicy="no-referrer"
    />
  );
}

export default function VentasDirectasPage() {
  const [activeTab, setActiveTab] = useState<'nueva' | 'historial'>('nueva');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cart, setCart] = useState<{ producto: Producto; cantidad: number; precio_venta: number }[]>([]);
  const [nota, setNota] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isCartVisible, setIsCartVisible] = useState(false);

  // Historial states
  const [ventas, setVentas] = useState<VentaDirecta[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [perPage, setPerPage] = useState(25);
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');

  // Selected sale details modal
  const [selectedVenta, setSelectedVenta] = useState<VentaDirecta | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Product Search & Category Filters in POS
  const [buscarProducto, setBuscarProducto] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [categorias, setCategorias] = useState<any[]>([]);

  useEffect(() => {
    api.get('/categorias', { params: { per_page: 1000 } }).then(r => setCategorias(r.data.data || r.data));
  }, []);

  const loadProductos = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/productos', { params: { per_page: 1000 } });
      setProductos(r.data.data || r.data);
    } catch (e) {
      console.error(e);
      avisarErrorDeCarga(e, 'los productos');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistorial = useCallback(async (page = 1, limit = perPage) => {
    setHistorialLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: limit };
      if (filterFechaInicio) params.fecha_inicio = filterFechaInicio;
      if (filterFechaFin) params.fecha_fin = filterFechaFin;
      const r = await api.get('/ventas-directas', { params });
      setVentas(r.data.data);
      setPagination({ currentPage: r.data.current_page, lastPage: r.data.last_page, total: r.data.total });
    } catch (e) {
      console.error(e);
      avisarErrorDeCarga(e, 'el historial de ventas');
    } finally {
      setHistorialLoading(false);
    }
  }, [perPage, filterFechaInicio, filterFechaFin]);

  useEffect(() => {
    if (activeTab === 'nueva') {
      loadProductos();
    } else {
      loadHistorial(1);
    }
  }, [activeTab, loadProductos, loadHistorial]);

  useEffect(() => {
    if (activeTab !== 'nueva') return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCartVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    const el = document.getElementById('cart-section');
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [activeTab, cart.length]);

  const addToCart = (prod: Producto) => {
    if (prod.stock_actual <= 0) {
      alert('Este producto no cuenta con stock disponible.');
      return;
    }
    const existing = cart.find(item => item.producto.id === prod.id);
    if (existing) {
      if (existing.cantidad >= prod.stock_actual) {
        alert(`No puedes vender más de la existencia actual (${prod.stock_actual}).`);
        return;
      }
      setCart(cart.map(item => item.producto.id === prod.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCart([...cart, { producto: prod, cantidad: 1, precio_venta: prod.precio_venta }]);
    }
  };

  const updateCartPrice = (prodId: number, val: number) => {
    if (val < 0) return;
    setCart(cart.map(item => item.producto.id === prodId ? { ...item, precio_venta: val } : item));
  };

  const updateCartQty = (prodId: number, val: number, maxStock: number) => {
    if (val <= 0) return;
    if (val > maxStock) {
      alert(`No puedes vender más de la existencia actual (${maxStock}).`);
      return;
    }
    setCart(cart.map(item => item.producto.id === prodId ? { ...item, cantidad: val } : item));
  };

  const removeFromCart = (prodId: number) => {
    setCart(cart.filter(item => item.producto.id !== prodId));
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate that custom prices are not less than production cost
    const invalidPriceItem = cart.find(item => Number(item.precio_venta) < Number(item.producto.costo));
    if (invalidPriceItem) {
      alert(`El precio ingresado para "${invalidPriceItem.producto.nombre}" no es válido.`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        nota,
        detalles: cart.map(item => ({
          producto_id: item.producto.id,
          cantidad: item.cantidad,
          precio_venta: item.precio_venta
        }))
      };
      await api.post('/ventas-directas', payload, { progressLabel: 'Registrando venta...' });
      alert('Venta realizada con éxito.');
      setCart([]);
      setNota('');
      loadProductos();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      alert(getFriendlyErrorMessage(err, 'No se pudo registrar la venta.'));
    } finally {
      setSubmitting(false);
    }
  };

  const viewDetails = async (venta: VentaDirecta) => {
    try {
      const r = await api.get(`/ventas-directas/${venta.id}`, { progressLabel: 'Cargando detalle de la venta...' });
      setSelectedVenta(r.data);
      setModalOpen(true);
    } catch (e) {
      console.error(e);
      alert(getFriendlyErrorMessage(e, 'No se pudo abrir el detalle de la venta.'));
    }
  };

  const filteredProducts = productos.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(buscarProducto.toLowerCase()) || 
                          (p.codigo && p.codigo.toLowerCase().includes(buscarProducto.toLowerCase())) ||
                          (p.marca && p.marca.toLowerCase().includes(buscarProducto.toLowerCase()));
    const matchesCategory = categoriaFilter === '' || String(p.categoria_id) === categoriaFilter;
    return matchesSearch && matchesCategory;
  });

  const cartTotal = cart.reduce((sum, item) => sum + (item.precio_venta * item.cantidad), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Ventas Directas (Inventario Global)</h1>
        <div className="flex bg-gray-100 p-0.5 rounded-lg border border-border">
          <button
            onClick={() => setActiveTab('nueva')}
            className={`px-3 py-1.5 text-xs font-semibold rounded ${
              activeTab === 'nueva' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Nueva Venta (POS)
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`px-3 py-1.5 text-xs font-semibold rounded ${
              activeTab === 'historial' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Historial de Ventas
          </button>
        </div>
      </div>

      {activeTab === 'nueva' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Productos column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg border border-border p-4 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                <h2 className="text-sm font-semibold text-text-primary">Dulces Disponibles</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o código..."
                      value={buscarProducto}
                      onChange={e => setBuscarProducto(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                    />
                  </div>
                  <select
                    value={categoriaFilter}
                    onChange={e => setCategoriaFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                  >
                    <option value="">Todas las categorías</option>
                    {categorias.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                  {(buscarProducto || categoriaFilter) && (
                    <button
                      onClick={() => {
                        setBuscarProducto('');
                        setCategoriaFilter('');
                      }}
                      className="text-xs text-danger font-semibold hover:underline px-1"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
              {loading ? (
                <SectionLoading label="Cargando productos..." />
              ) : filteredProducts.length === 0 ? (
                <p className="text-sm text-text-muted">No se encontraron productos.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      disabled={p.stock_actual <= 0}
                      className="p-2 border border-border rounded-lg text-left hover:border-primary hover:bg-surface/50 active:bg-primary/10 active:border-primary transition-all flex gap-3 h-28 bg-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0 flex items-center justify-center border border-border">
                        <SafeImage src={p.imagen_url} fallbackIcon={<Package size={24} className="text-text-muted opacity-40" />} />
                      </div>
                      <div className="flex-1 flex flex-col justify-between min-w-0 h-full">
                        <div>
                          <p className="font-semibold text-[10px] text-text-secondary font-mono leading-tight">{p.codigo}</p>
                          <p className="font-semibold text-sm text-text-primary truncate w-full leading-snug">{p.nombre}</p>
                          <p className="text-[11px] text-text-muted">{p.marca || ''}</p>
                        </div>
                        <div className="flex justify-between items-end w-full">
                          <span className="text-xs text-text-muted">Stock: <strong className={p.stock_actual <= p.stock_minimo ? 'text-danger font-semibold' : 'text-text-primary'}>{p.stock_actual}</strong></span>
                          <span className="text-sm font-semibold text-primary">{formatCurrency(p.precio_venta)}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Carrito column */}
          <div id="cart-section" className="bg-white rounded-lg border border-border p-4 shadow-sm flex flex-col h-[550px] justify-between">
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-2 border-b border-border pb-3 mb-3">
                <ShoppingCart size={16} className="text-primary" />
                <h2 className="text-sm font-semibold text-text-primary">Carrito de Compra</h2>
              </div>

              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-text-muted">
                  <ShoppingCart size={32} className="opacity-30 mb-2" />
                  <p className="text-xs">El carrito está vacío.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {cart.map(item => (
                    <div key={item.producto.id} className="flex justify-between items-center border-b border-border pb-2 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{item.producto.nombre}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-text-muted">P. Unit: $</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.precio_venta}
                            onChange={e => updateCartPrice(item.producto.id, parseFloat(e.target.value) || 0)}
                            className={`w-16 px-1.5 py-0.5 text-xs border rounded bg-white font-semibold focus:outline-none focus:ring-1 ${
                              Number(item.precio_venta) < Number(item.producto.costo)
                                ? 'border-danger text-danger focus:ring-danger'
                                : 'border-border text-text-primary focus:ring-primary'
                            }`}
                          />
                          {item.precio_venta !== item.producto.precio_venta && (
                            <button
                              type="button"
                              onClick={() => updateCartPrice(item.producto.id, item.producto.precio_venta)}
                              className="text-[9px] text-primary hover:underline font-semibold"
                              title="Restablecer precio original"
                            >
                              Restablecer
                            </button>
                          )}
                        </div>
                        {Number(item.precio_venta) < Number(item.producto.costo) && (
                          <span className="text-[9px] text-danger font-semibold block mt-0.5">
                            Precio no válido
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <input
                          type="number"
                          value={item.cantidad}
                          onKeyDown={handleIntegerKeyDown}
                          onChange={e => updateCartQty(item.producto.id, parseInt(e.target.value) || 1, item.producto.stock_actual)}
                          className="w-14 text-center px-1.5 py-1 text-xs border border-border rounded"
                          min="1"
                        />
                        <button
                          onClick={() => removeFromCart(item.producto.id)}
                          className="p-1 text-text-muted hover:text-danger rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleCheckout} className="border-t border-border pt-3 mt-3 space-y-3 flex-shrink-0">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Nota / Cliente (Informal)</label>
                <input
                  type="text"
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  placeholder="Ej: Juan Pérez / Evento"
                  className="w-full px-3 py-1.5 text-xs border border-border rounded-md"
                />
              </div>

              <div className="flex justify-between items-center text-sm font-semibold text-text-primary">
                <span>Total:</span>
                <span className="text-base text-primary font-bold">{formatCurrency(cartTotal)}</span>
              </div>

              <button
                type="submit"
                disabled={submitting || cart.length === 0}
                className="w-full py-2 bg-primary text-white text-xs font-semibold rounded-md hover:bg-primary-hover disabled:opacity-60 transition-colors"
              >
                {submitting ? 'Procesando...' : 'Concretar venta'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Historial tab */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-lg border border-border flex-wrap">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-xs text-text-secondary">Desde:</span>
                <input
                  type="date"
                  value={filterFechaInicio}
                  onChange={e => setFilterFechaInicio(e.target.value)}
                  className="px-2 py-1 text-xs border border-border rounded bg-white"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-text-secondary">Hasta:</span>
                <input
                  type="date"
                  value={filterFechaFin}
                  onChange={e => setFilterFechaFin(e.target.value)}
                  className="px-2 py-1 text-xs border border-border rounded bg-white"
                />
              </div>
              <button
                onClick={() => loadHistorial(1)}
                className="px-3 py-1 text-xs bg-primary text-white font-semibold rounded hover:bg-primary-hover transition-colors"
              >
                Filtrar
              </button>
              {(filterFechaInicio || filterFechaFin) && (
                <button
                  onClick={() => {
                    setFilterFechaInicio('');
                    setFilterFechaFin('');
                    // Trigger load instantly
                    setTimeout(() => loadHistorial(1, perPage), 0);
                  }}
                  className="text-xs text-danger font-semibold hover:underline ml-2"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-text-secondary">Filas por página:</span>
              <select
                value={perPage}
                onChange={e => {
                  setPerPage(Number(e.target.value));
                  loadHistorial(1, Number(e.target.value));
                }}
                className="px-2.5 py-1 text-xs border border-border rounded bg-white"
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
                  <th className="px-4 py-3 font-semibold text-text-secondary">Folio/ID</th>
                  <th className="px-4 py-3 font-semibold text-text-secondary">Fecha</th>
                  <th className="px-4 py-3 font-semibold text-text-secondary">Usuario Vendedor</th>
                  <th className="px-4 py-3 font-semibold text-text-secondary">Nota</th>
                  <th className="px-4 py-3 font-semibold text-text-secondary text-right">Total</th>
                  <th className="px-4 py-3 font-semibold text-text-secondary text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {historialLoading ? (
                  <TableLoading colSpan={6} label="Cargando historial de ventas..." />
                ) : ventas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-text-muted">
                      No se encontraron ventas directas.
                    </td>
                  </tr>
                ) : (
                  ventas.map(v => (
                    <tr key={v.id} className="border-b border-border hover:bg-surface/50">
                      <td className="px-4 py-3 font-semibold text-primary font-mono text-xs">#{v.id}</td>
                      <td className="px-4 py-3">{formatDate(v.fecha)}</td>
                      <td className="px-4 py-3">{v.usuario?.name}</td>
                      <td className="px-4 py-3 text-text-secondary truncate max-w-[200px]" title={v.nota || ''}>{v.nota || '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-text-primary tabular-nums">{formatCurrency(v.total)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => viewDetails(v)}
                          className="px-2.5 py-1 text-xs border border-border rounded hover:bg-surface font-semibold text-text-secondary transition-colors"
                        >
                          Detalle
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination controls */}
            {!historialLoading && pagination.lastPage > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-surface/30 flex-wrap gap-2">
                <div className="text-xs text-text-secondary">
                  Mostrando página <span className="font-semibold">{pagination.currentPage}</span> de{' '}
                  <span className="font-semibold">{pagination.lastPage}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    disabled={pagination.currentPage <= 1}
                    onClick={() => loadHistorial(pagination.currentPage - 1)}
                    className="px-2.5 py-1 text-xs font-medium border border-border rounded hover:bg-surface bg-white disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  {Array.from({ length: pagination.lastPage }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => loadHistorial(idx + 1)}
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
                    onClick={() => loadHistorial(pagination.currentPage + 1)}
                    className="px-2.5 py-1 text-xs font-medium border border-border rounded hover:bg-surface bg-white disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sale Details Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Detalle de Venta Directa #${selectedVenta?.id}`} size="lg">
        {selectedVenta && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs bg-surface p-3 rounded-lg border border-border">
              <div>
                <p className="text-text-secondary">Fecha:</p>
                <p className="font-semibold text-text-primary">{formatDate(selectedVenta.fecha)}</p>
              </div>
              <div>
                <p className="text-text-secondary">Registró:</p>
                <p className="font-semibold text-text-primary">{selectedVenta.usuario?.name}</p>
              </div>
              {selectedVenta.nota && (
                <div className="col-span-2">
                  <p className="text-text-secondary">Nota/Cliente:</p>
                  <p className="font-semibold text-text-primary">{selectedVenta.nota}</p>
                </div>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface border-b border-border text-left">
                    <th className="px-3 py-2 font-semibold text-text-secondary">Producto</th>
                    <th className="px-3 py-2 font-semibold text-text-secondary">Código</th>
                    <th className="px-3 py-2 font-semibold text-text-secondary text-center">Cantidad</th>
                    <th className="px-3 py-2 font-semibold text-text-secondary text-right">Precio unitario</th>
                    <th className="px-3 py-2 font-semibold text-text-secondary text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedVenta.detalles?.map(det => (
                    <tr key={det.id} className="border-b border-border">
                      <td className="px-3 py-2 font-medium">{det.producto?.nombre}</td>
                      <td className="px-3 py-2 font-mono">{det.producto?.codigo}</td>
                      <td className="px-3 py-2 text-center">{det.cantidad}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(det.precio_venta)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatCurrency(det.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center text-sm font-semibold border-t border-border pt-3">
              <span>Total:</span>
              <span className="text-primary text-base font-bold">{formatCurrency(selectedVenta.total)}</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold border border-border rounded hover:bg-surface"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
      {/* Floating Cart Button for Mobile */}
      {cart.length > 0 && !isCartVisible && (
        <div className="fixed bottom-4 right-4 z-40 lg:hidden">
          <button
            type="button"
            onClick={() => {
              document.getElementById('cart-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-2 px-4 py-3 bg-primary text-white font-semibold rounded-full shadow-lg hover:bg-primary-hover active:scale-95 active:bg-primary-hover transition-all text-xs"
          >
            <ShoppingCart size={15} />
            <span>Ver Carrito ({cart.reduce((sum, i) => sum + i.cantidad, 0)})</span>
            <span className="border-l border-white/20 pl-2">{formatCurrency(cartTotal)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
