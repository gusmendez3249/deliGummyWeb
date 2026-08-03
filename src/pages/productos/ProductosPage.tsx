import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle, Package } from 'lucide-react';
import api from '../../api/axios';
import type { Producto, Categoria, UnidadMedida, CargaVendedor } from '../../types';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ImageCapture from '../../components/ui/ImageCapture';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { handleDecimalKeyDown, handleIntegerKeyDown } from '../../utils/keyboard';
import ClearFiltersButton from '../../components/ui/ClearFiltersButton';

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

function StockAdder({ product, onAdded }: { product: Producto; onAdded: () => void }) {
  const [qty, setQty] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(qty);
    if (isNaN(num) || num <= 0) return;
    setSubmitting(true);
    try {
      await api.post('/movimientos', {
        producto_id: product.id,
        tipo_movimiento: 'alta',
        cantidad: num,
        observaciones: 'Entrada rápida de stock desde catálogo'
      });
      setQty('');
      alert(`Se agregaron ${num} unidades a "${product.nombre}" con éxito.`);
      onAdded();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Error al agregar stock.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1 justify-center">
      <input
        type="number"
        min="1"
        value={qty}
        onChange={e => setQty(e.target.value)}
        onKeyDown={handleIntegerKeyDown}
        placeholder="+ Cant"
        className="w-16 px-2 py-1 text-xs border border-border rounded text-center focus:outline-none focus:ring-1 focus:ring-primary"
        disabled={submitting}
      />
      <button
        type="submit"
        disabled={submitting || !qty}
        className="px-2.5 py-1 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded disabled:opacity-50 transition-colors"
      >
        {submitting ? '...' : 'Sumar'}
      </button>
    </form>
  );
}

export default function ProductosPage() {
  const { user } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [vendedorStock, setVendedorStock] = useState<Record<number, number>>({});

  const isVendedor = user?.role?.nombre === 'Vendedor';
  const isConsulta = user?.role?.nombre === 'Consulta';
  const isEncargado = user?.role?.nombre === 'Encargado';
  const showActions = !isVendedor && !isConsulta;

  useEffect(() => {
    if (isVendedor) {
      api.get('/mis-cargas')
        .then(res => {
          const cargas: CargaVendedor[] = res.data.data || res.data;
          const stockMap: Record<number, number> = {};
          cargas.forEach(c => {
            if (c.estado === 'abierta') {
              c.detalles.forEach(d => {
                stockMap[d.producto_id] = (stockMap[d.producto_id] || 0) + d.cantidad_salida;
              });
            }
          });
          setVendedorStock(stockMap);
        })
        .catch(err => console.error('Error al cargar stock del vendedor:', err));
    }
  }, [isVendedor]);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Producto | null>(null);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [perPage, setPerPage] = useState(25);
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterUnidad, setFilterUnidad] = useState('');
  const [filterStockEstado, setFilterStockEstado] = useState('');
  const [filterPrecioMin, setFilterPrecioMin] = useState('');
  const [filterPrecioMax, setFilterPrecioMax] = useState('');
  const [formData, setFormData] = useState({
    codigo: '', nombre: '', descripcion: '', categoria_id: '', unidad_medida_id: '',
    marca: '', costo: '', precio_venta: '', stock_actual: '', stock_minimo: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadProductos = useCallback(async (page = 1, limit = perPage) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: limit };
      if (searchQuery) params.buscar = searchQuery;
      if (filterCategoria) params.categoria_id = filterCategoria;
      if (filterUnidad) params.unidad_medida_id = filterUnidad;
      if (filterStockEstado) params.stock_estado = filterStockEstado;
      if (filterPrecioMin) params.precio_min = filterPrecioMin;
      if (filterPrecioMax) params.precio_max = filterPrecioMax;
      const res = await api.get('/productos', { params });
      setProductos(res.data.data);
      setPagination({ currentPage: res.data.current_page, lastPage: res.data.last_page, total: res.data.total });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterCategoria, filterUnidad, filterStockEstado, filterPrecioMin, filterPrecioMax, perPage]);

  // Refetch when perPage changes
  useEffect(() => {
    loadProductos(1, perPage);
  }, [perPage, loadProductos]);

  useEffect(() => { loadProductos(); }, [loadProductos]);
  useEffect(() => {
    api.get('/categorias').then(r => setCategorias(r.data));
    api.get('/unidades-medida').then(r => setUnidades(r.data));
  }, []);

  const openCreate = () => {
    setEditingProduct(null);
    setFormData({ codigo: '', nombre: '', descripcion: '', categoria_id: '', unidad_medida_id: '', marca: '', costo: '', precio_venta: '', stock_actual: '', stock_minimo: '' });
    setImageFile(null); setImagePreview(null); setErrors({});
    setModalOpen(true);
  };

  const openEdit = (p: Producto) => {
    setEditingProduct(p);
    setFormData({
      codigo: p.codigo, nombre: p.nombre, descripcion: p.descripcion || '',
      categoria_id: String(p.categoria_id), unidad_medida_id: String(p.unidad_medida_id),
      marca: p.marca || '', costo: String(p.costo), precio_venta: String(p.precio_venta),
      stock_actual: isEncargado ? '' : String(p.stock_actual), stock_minimo: String(p.stock_minimo),
    });
    setImageFile(null); setImagePreview(p.imagen_url); setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(formData.costo);
    const price = parseFloat(formData.precio_venta);
    if (!isNaN(cost) && !isNaN(price) && cost >= price) {
      setErrors({ precio_venta: 'El precio de venta debe ser estrictamente mayor al costo.' });
      return;
    }
    setSubmitting(true); setErrors({});
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append('imagen', imageFile);

      if (editingProduct) {
        await api.post(`/productos/${editingProduct.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/productos', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setModalOpen(false);
      loadProductos(pagination.currentPage);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      if (axiosErr.response?.data?.errors) {
        const flat: Record<string, string> = {};
        Object.entries(axiosErr.response.data.errors).forEach(([k, v]) => { flat[k] = v[0]; });
        setErrors(flat);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await api.delete(`/productos/${productToDelete.id}`);
      setDeleteModalOpen(false);
      setProductToDelete(null);
      loadProductos(pagination.currentPage);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      alert(axiosErr.response?.data?.message || 'Error al eliminar.');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
  };

  const columns = [
    {
      key: 'imagen', header: '', className: 'w-12',
      render: (p: Producto) => (
        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
          <SafeImage src={p.imagen_url} fallbackIcon={<Package size={16} className="text-text-muted" />} />
        </div>
      ),
    },
    { key: 'codigo', header: 'Codigo', className: 'font-mono text-xs' },
    { key: 'nombre', header: 'Nombre', render: (p: Producto) => <span className="font-medium">{p.nombre}</span> },
    { key: 'categoria', header: 'Categoria', render: (p: Producto) => p.categoria?.nombre },
    ...(isVendedor ? [] : [{ key: 'costo', header: 'Costo', className: 'tabular-nums', render: (p: Producto) => formatCurrency(p.costo) }]),
    { key: 'precio_venta', header: 'Precio venta', className: 'tabular-nums', render: (p: Producto) => formatCurrency(p.precio_venta) },
    {
      key: 'stock', header: isVendedor ? 'Mi Stock (Ruta)' : 'Stock', className: 'tabular-nums',
      render: (p: Producto) => (
        <div className="flex items-center gap-1.5">
          {isVendedor ? (
            <span className="font-semibold text-primary">{formatNumber(vendedorStock[p.id] || 0)}</span>
          ) : (
            <>
              <span className={p.stock_actual <= p.stock_minimo ? 'text-danger font-semibold' : ''}>{formatNumber(p.stock_actual)}</span>
              {p.stock_actual <= p.stock_minimo && <AlertTriangle size={14} className="text-danger" />}
            </>
          )}
        </div>
      ),
    },
    ...(showActions ? [{
      key: 'agregar_inventario', header: 'Agregar Inventario', className: 'w-32 text-center',
      render: (p: Producto) => (
        <StockAdder product={p} onAdded={() => loadProductos(pagination.currentPage)} />
      )
    }] : [])
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Productos</h1>
        {showActions && !isEncargado && (
          <button onClick={openCreate} className="flex items-center gap-2 px-3 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover">
            <Plus size={16} /> Nuevo producto
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center bg-white p-3 rounded-lg border border-border">
        <div className="w-full sm:w-auto">
          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 text-sm border border-border rounded-md bg-white sm:min-w-[140px]"
          >
            <option value="">Todas las categorias</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="w-full sm:w-auto">
          <select
            value={filterUnidad}
            onChange={(e) => setFilterUnidad(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 text-sm border border-border rounded-md bg-white sm:min-w-[140px]"
          >
            <option value="">Todas las unidades</option>
            {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        </div>
        <div className="w-full sm:w-auto">
          <select
            value={filterStockEstado}
            onChange={(e) => setFilterStockEstado(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 text-sm border border-border rounded-md bg-white sm:min-w-[140px]"
          >
            <option value="">Todos los stocks</option>
            <option value="bajo">Stock Bajo</option>
            <option value="con_stock">Con Stock</option>
            <option value="sin_stock">Sin Stock (Agotado)</option>
          </select>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="number"
            placeholder="Min"
            value={filterPrecioMin}
            onKeyDown={handleDecimalKeyDown}
            onChange={e => setFilterPrecioMin(e.target.value)}
            className="flex-1 sm:w-24 px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary min-w-0"
          />
          <span className="text-text-muted text-xs">—</span>
          <input
            type="number"
            placeholder="Max"
            value={filterPrecioMax}
            onKeyDown={handleDecimalKeyDown}
            onChange={e => setFilterPrecioMax(e.target.value)}
            className="flex-1 sm:w-24 px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary min-w-0"
          />
        </div>
        <div className="w-full sm:w-auto flex justify-end">
          <ClearFiltersButton
            visible={!!(filterCategoria || filterUnidad || filterStockEstado || filterPrecioMin || filterPrecioMax)}
            onClick={() => {
              setFilterCategoria('');
              setFilterUnidad('');
              setFilterStockEstado('');
              setFilterPrecioMin('');
              setFilterPrecioMax('');
              loadProductos(1);
            }}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={productos}
        searchPlaceholder="Buscar por nombre, codigo o marca..."
        onSearch={setSearchQuery}
        isLoading={loading}
        emptyMessage="No hay productos registrados."
        pagination={{
          ...pagination,
          onPageChange: loadProductos,
          perPage,
          onPerPageChange: (val) => {
            setPerPage(val);
          }
        }}
        actions={showActions ? (p) => {
          const prod = p as unknown as Producto;
          return (
            <>
              <button onClick={() => openEdit(prod)} className="p-1.5 text-text-muted hover:text-primary rounded" title="Editar">
                <Pencil size={15} />
              </button>
              {!isEncargado && (
                <button onClick={() => { setProductToDelete(prod); setDeleteModalOpen(true); }} className="p-1.5 text-text-muted hover:text-danger rounded" title="Eliminar">
                  <Trash2 size={15} />
                </button>
              )}
            </>
          );
        } : undefined}
      />

      {/* Modal Form */}
      {/* Modal Form */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingProduct ? (isEncargado ? 'Actualizar Stock' : 'Editar producto') : 'Nuevo producto'} size={isEncargado ? "sm" : "lg"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isEncargado ? (
            <div className="space-y-4">
              <div className="p-3 bg-surface rounded-lg border border-border">
                <p className="text-xs font-mono text-text-secondary">{formData.codigo}</p>
                <h3 className="font-semibold text-text-primary text-base">{formData.nombre}</h3>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Stock a agregar (Sumar) *</label>
                <input type="number" min="0" value={formData.stock_actual} onChange={e => setFormData({...formData, stock_actual: e.target.value})} onFocus={(e) => e.target.select()} onKeyDown={handleIntegerKeyDown} className="w-full px-3 py-2 text-sm border border-border rounded-md" placeholder="Ej: 10" required />
                {errors.stock_actual && <p className="text-xs text-danger mt-1">{errors.stock_actual}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Stock minimo</label>
                <input type="number" min="0" value={formData.stock_minimo} onChange={e => setFormData({...formData, stock_minimo: e.target.value})} onFocus={(e) => e.target.select()} onKeyDown={handleIntegerKeyDown} className="w-full px-3 py-2 text-sm border border-border rounded-md" />
                {errors.stock_minimo && <p className="text-xs text-danger mt-1">{errors.stock_minimo}</p>}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Codigo</label>
                  <input 
                    value={editingProduct ? formData.codigo : '(Autogenerado)'} 
                    disabled={true} 
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-gray-50 font-mono text-text-secondary cursor-not-allowed" 
                  />
                  {errors.codigo && <p className="text-xs text-danger mt-1">{errors.codigo}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Nombre *</label>
                  <input value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full px-3 py-2 text-sm border border-border rounded-md" required />
                  {errors.nombre && <p className="text-xs text-danger mt-1">{errors.nombre}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Categoria *</label>
                  <select value={formData.categoria_id} onChange={e => setFormData({...formData, categoria_id: e.target.value})} className="w-full px-3 py-2 text-sm border border-border rounded-md" required>
                    <option value="">Seleccionar</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  {errors.categoria_id && <p className="text-xs text-danger mt-1">{errors.categoria_id}</p>}
                </div>
                 <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Unidad de medida *</label>
                  <select value={formData.unidad_medida_id} onChange={e => setFormData({...formData, unidad_medida_id: e.target.value})} className="w-full px-3 py-2 text-sm border border-border rounded-md" required>
                    <option value="">Seleccionar</option>
                    {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.abreviatura})</option>)}
                  </select>
                  {errors.unidad_medida_id && <p className="text-xs text-danger mt-1">{errors.unidad_medida_id}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Marca</label>
                  <input value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} className="w-full px-3 py-2 text-sm border border-border rounded-md" />
                  {errors.marca && <p className="text-xs text-danger mt-1">{errors.marca}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Costo *</label>
                  <input type="number" step="0.01" min="0" value={formData.costo} onChange={e => setFormData({...formData, costo: e.target.value})} onFocus={(e) => e.target.select()} onKeyDown={handleDecimalKeyDown} className="w-full px-3 py-2 text-sm border border-border rounded-md" required />
                  {errors.costo && <p className="text-xs text-danger mt-1">{errors.costo}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Precio de venta *</label>
                  <input type="number" step="0.01" min="0" value={formData.precio_venta} onChange={e => setFormData({...formData, precio_venta: e.target.value})} onFocus={(e) => e.target.select()} onKeyDown={handleDecimalKeyDown} className="w-full px-3 py-2 text-sm border border-border rounded-md" required />
                  {errors.precio_venta && <p className="text-xs text-danger mt-1">{errors.precio_venta}</p>}
                </div>
                {!editingProduct && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Stock inicial</label>
                    <input type="number" min="0" value={formData.stock_actual} onChange={e => setFormData({...formData, stock_actual: e.target.value})} onFocus={(e) => e.target.select()} onKeyDown={handleIntegerKeyDown} className="w-full px-3 py-2 text-sm border border-border rounded-md" />
                    {errors.stock_actual && <p className="text-xs text-danger mt-1">{errors.stock_actual}</p>}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Stock minimo</label>
                  <input type="number" min="0" value={formData.stock_minimo} onChange={e => setFormData({...formData, stock_minimo: e.target.value})} onFocus={(e) => e.target.select()} onKeyDown={handleIntegerKeyDown} className="w-full px-3 py-2 text-sm border border-border rounded-md" />
                  {errors.stock_minimo && <p className="text-xs text-danger mt-1">{errors.stock_minimo}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Descripcion</label>
                <textarea value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} rows={2} className="w-full px-3 py-2 text-sm border border-border rounded-md resize-none" />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Imagen del producto</label>
                <ImageCapture
                  imagePreview={imagePreview}
                  onImageSelected={(file, previewUrl) => {
                    setImageFile(file);
                    setImagePreview(previewUrl);
                  }}
                  captureMode="environment"
                />
              </div>
            </>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border border-border rounded-md hover:bg-surface">Cancelar</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-60">
              {submitting ? 'Guardando...' : editingProduct ? 'Actualizar' : 'Crear producto'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirmar eliminación" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            ¿Estás seguro de que deseas eliminar el producto <strong>{productToDelete?.nombre}</strong>? Esta acción no se puede deshacer.
          </p>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button type="button" onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 text-sm border border-border rounded-md hover:bg-surface">
              Cancelar
            </button>
            <button type="button" onClick={confirmDelete} className="px-4 py-2 text-sm bg-danger text-white rounded-md hover:bg-red-700">
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
