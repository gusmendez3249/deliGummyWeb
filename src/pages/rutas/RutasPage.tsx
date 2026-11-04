import { useEffect, useState, useCallback } from 'react';
import { Plus, Eye, EyeOff, CheckCircle, Package, XCircle, AlertTriangle, List, Grid, Edit, ShieldAlert } from 'lucide-react';
import api from '../../api/axios';
import type { CargaVendedor, Producto, User } from '../../types';
import Modal from '../../components/ui/Modal';
import { formatDate, formatCurrency, estadoCargaColor, toLocalDateString } from '../../utils/formatters';
import { handleIntegerKeyDown, handleDecimalKeyDown } from '../../utils/keyboard';
import ClearFiltersButton from '../../components/ui/ClearFiltersButton';
import TableLoading from '../../components/ui/TableLoading';

interface ExcelRow {
  producto_id: number;
  nombre: string;
  codigo: string;
  costo: number;
  precio_venta: number;
  stock_actual: number;
  cantidad: number; // loaded
  vendido: number;
  sobrante: number; // quantity - vendido
  subtotal: number; // vendido * precio_venta
  pago_vendedor: number; // commission
  precio_real: number; // precio_venta - (pago_vendedor / vendido)
  inversion: number; // vendido * costo
  ganancia: number; // subtotal - inversion - pago_vendedor
  original_cantidad?: number;
}

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

export default function RutasPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'nueva'>('list');
  const [cargas, setCargas] = useState<CargaVendedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [vendedores, setVendedores] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [closeModal, setCloseModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedCarga, setSelectedCarga] = useState<CargaVendedor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [cargaToCancel, setCargaToCancel] = useState<number | null>(null);

  // Password verification modal for editing
  const [passwordModal, setPasswordModal] = useState(false);
  const [verifyPasswordVal, setVerifyPasswordVal] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cargaToEdit, setCargaToEdit] = useState<CargaVendedor | null>(null);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [targetEditEstado, setTargetEditEstado] = useState<'abierta' | 'cerrada' | 'cancelada' | null>(null);

  // Filters & Page Size States
  const [vendedorFilter, setVendedorFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [fechaInicioFilter, setFechaInicioFilter] = useState(getWeekRange().start);
  const [fechaFinFilter, setFechaFinFilter] = useState(getWeekRange().end);
  const [perPage, setPerPage] = useState(25);

  // Close form - only user input is cantidad_devuelta
  const [cierreDetalles, setCierreDetalles] = useState<{ detalle_id: number; cantidad_devuelta: string }[]>([]);

  // Excel mode state
  const [editingCargaId, setEditingCargaId] = useState<number | null>(null);
  const [excelVendedorId, setExcelVendedorId] = useState('');
  const [excelFecha, setExcelFecha] = useState(toLocalDateString());
  const [excelObservaciones, setExcelObservaciones] = useState('');
  const [excelGasolina, setExcelGasolina] = useState('300');
  const [excelMerma, setExcelMerma] = useState('50');
  const [excelEfectivoEntregado, setExcelEfectivoEntregado] = useState('0');
  const [excelEstado, setExcelEstado] = useState<'abierta' | 'cerrada' | 'cancelada'>('cerrada');
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [showGananciaNeta, setShowGananciaNeta] = useState(false);
  const [cancelExcelModal, setCancelExcelModal] = useState(false);

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
      if (vendId) params.usuario_id = vendId;
      if (est) params.estado = est;
      if (fInicio) params.fecha_inicio = fInicio;
      if (fFin) params.fecha_fin = fFin;
      const r = await api.get('/cargas', { params });
      setCargas(r.data.data);
      setPagination({ currentPage: r.data.current_page, lastPage: r.data.last_page, total: r.data.total });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [perPage, vendedorFilter, estadoFilter, fechaInicioFilter, fechaFinFilter]);

  useEffect(() => {
    load(1);
  }, [load]);

  useEffect(() => {
    api.get('/productos', { params: { per_page: 1000 } }).then(r => {
      const prodList = r.data.data || r.data;
      setProductos(prodList);
      initializeExcel(prodList, null);
    });

    api
      .get('/users', { params: { role_id: 3 } })
      .then(r => setVendedores(r.data))
      .catch(() => api.get('/users').then(r => setVendedores(r.data)));
  }, []);

  const initializeExcel = (prodList: Producto[], vendedorProfile: any) => {
    const data = prodList.map(p => ({
      producto_id: p.id,
      nombre: p.nombre,
      codigo: p.codigo,
      costo: Number(p.costo || 0),
      precio_venta: Number(p.precio_venta || 0),
      stock_actual: Number(p.stock_actual || 0),
      cantidad: 0,
      vendido: 0,
      sobrante: 0,
      subtotal: 0,
      pago_vendedor: 0,
      precio_real: Number(p.precio_venta || 0),
      inversion: 0,
      ganancia: 0,
      original_cantidad: 0,
    }));
    setExcelData(data);
  };

  const calculateComision = (subtotal: number, qtySold: number, vendedorProfile: any) => {
    if (!vendedorProfile || qtySold <= 0) return 0;
    const { tipo_pago, comision_porcentaje, comision_monto_fijo } = vendedorProfile;
    if (tipo_pago === 'fijo') return 0;
    if (tipo_pago === 'comision' || tipo_pago === 'mixto') {
      const pct = parseFloat(comision_porcentaje || '0');
      if (pct > 0) {
        return subtotal * (pct / 100);
      }
      return parseFloat(comision_monto_fijo || '0');
    }
    return 0;
  };

  const updateExcelRow = (index: number, field: 'cantidad' | 'vendido', value: string) => {
    const numVal = Math.max(0, parseInt(value) || 0);
    const selectedVendedorUser = vendedores.find(v => String(v.id) === excelVendedorId);
    const vendedorProfile = selectedVendedorUser?.vendedor;

    setExcelData(prev => {
      const copy = [...prev];
      const row = { ...copy[index] };

      if (field === 'cantidad') {
        const maxStock = row.stock_actual + (row.original_cantidad || 0);
        if (numVal > maxStock) {
          alert(`La cantidad cargada para "${row.nombre}" (${numVal}) no puede ser mayor al stock disponible (${maxStock}).`);
          row.cantidad = maxStock;
        } else {
          row.cantidad = numVal;
        }
        if (row.vendido > row.cantidad) {
          row.vendido = row.cantidad;
        }
      } else {
        if (numVal > 0 && row.cantidad === 0) {
          alert(`No se puede registrar venta para "${row.nombre}" porque no tiene cantidad cargada.`);
          row.vendido = 0;
        } else if (numVal > row.cantidad) {
          alert(`La cantidad vendida de "${row.nombre}" (${numVal}) no puede superar la cantidad cargada (${row.cantidad}).`);
          row.vendido = row.cantidad;
        } else {
          row.vendido = numVal;
        }
      }

      // sobrante = cantidad - vendido
      row.sobrante = Math.max(0, row.cantidad - row.vendido);
      row.subtotal = row.vendido * row.precio_venta;
      row.pago_vendedor = calculateComision(row.subtotal, row.vendido, vendedorProfile);
      row.precio_real = row.vendido > 0 ? row.precio_venta - (row.pago_vendedor / row.vendido) : row.precio_venta;
      row.inversion = row.vendido * row.costo;
      row.ganancia = row.subtotal - row.inversion - row.pago_vendedor;

      copy[index] = row;
      return copy;
    });
  };

  // Recalculate commissions when seller changes
  useEffect(() => {
    const selectedVendedorUser = vendedores.find(v => String(v.id) === excelVendedorId);
    const vendedorProfile = selectedVendedorUser?.vendedor;

    setExcelData(prev =>
      prev.map(row => {
        const subtotal = row.vendido * row.precio_venta;
        const pago_vendedor = calculateComision(subtotal, row.vendido, vendedorProfile);
        const precio_real = row.vendido > 0 ? row.precio_venta - (pago_vendedor / row.vendido) : row.precio_venta;
        const ganancia = subtotal - row.inversion - pago_vendedor;
        return {
          ...row,
          pago_vendedor,
          precio_real,
          ganancia,
        };
      })
    );
  }, [excelVendedorId, vendedores]);

  // Excel Sheet Totals
  const totalCargados = excelData.reduce((sum, r) => sum + r.cantidad, 0);
  const totalVendidos = excelData.reduce((sum, r) => sum + r.vendido, 0);
  const subtotalVenta = excelData.reduce((sum, r) => sum + r.subtotal, 0);
  const efectivoReal = Math.max(0, subtotalVenta - (parseFloat(excelMerma) || 0));
  const deuda = efectivoReal - (parseFloat(excelEfectivoEntregado) || 0);

  const gananciaVendedor = excelData.reduce((sum, r) => sum + r.pago_vendedor, 0);
  const totalInversion = excelData.reduce((sum, r) => sum + r.inversion, 0);
  const gananciaProductos = subtotalVenta - totalInversion - gananciaVendedor;
  const gananciaNetaRuta = gananciaProductos - (parseFloat(excelGasolina) || 0) - (parseFloat(excelMerma) || 0);

  const handleGenerateRoute = async () => {
    if (!excelVendedorId) {
      alert('Por favor seleccione el vendedor.');
      return;
    }

    const activeRows = excelData.filter(r => r.cantidad > 0);
    if (activeRows.length === 0) {
      alert('Debe cargar al menos 1 producto con cantidad mayor a 0.');
      return;
    }

    // Validate that entered cash is not greater than expected (efectivoReal)
    const ingresado = parseFloat(excelEfectivoEntregado) || 0;
    if (ingresado > efectivoReal) {
      alert(`El efectivo entregado (${formatCurrency(ingresado)}) no puede ser mayor al efectivo real esperado (${formatCurrency(efectivoReal)}).`);
      return;
    }

    // Validate that vendido is not greater than loaded (cantidad)
    const invalidRow = activeRows.find(r => r.vendido > r.cantidad);
    if (invalidRow) {
      alert(`Para el producto "${invalidRow.nombre}", la cantidad vendida (${invalidRow.vendido}) no puede ser mayor que la cantidad cargada (${invalidRow.cantidad}).`);
      return;
    }

    // If it's a new route, force state to 'abierta' since it hasn't been closed/sold yet
    const finalEstado = editingCargaId ? excelEstado : 'abierta';

    setSubmitting(true);
    try {
      const payload = {
        usuario_id: parseInt(excelVendedorId),
        fecha: excelFecha,
        observaciones: excelObservaciones,
        gasolina: parseFloat(excelGasolina) || 0,
        merma: parseFloat(excelMerma) || 0,
        efectivo_entregado: parseFloat(excelEfectivoEntregado) || 0,
        efectivo_real: efectivoReal,
        deuda: deuda,
        estado: finalEstado,
        es_completa: finalEstado === 'cerrada',
        detalles: activeRows.map(r => ({
          producto_id: r.producto_id,
          cantidad_salida: r.cantidad,
          cantidad_vendida: r.vendido,
          cantidad_devuelta: r.sobrante, // Sobrante is the returned quantity
        })),
      };

      if (editingCargaId) {
        await api.put(`/cargas/${editingCargaId}`, payload, { progressLabel: 'Actualizando ruta...' });
        alert('Ruta actualizada exitosamente.');
      } else {
        await api.post('/cargas', payload, { progressLabel: 'Guardando ruta...' });
        alert('Ruta generada y guardada exitosamente.');
      }
      
      // Reset Excel form
      setEditingCargaId(null);
      setExcelVendedorId('');
      setExcelFecha(toLocalDateString());
      setExcelObservaciones('');
      setExcelGasolina('300');
      setExcelMerma('50');
      setExcelEfectivoEntregado('0');
      setExcelEstado('cerrada');
      initializeExcel(productos, null);

      // Return to list
      setActiveTab('list');
      load();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      alert(ax.response?.data?.message || 'Error al guardar la ruta');
    } finally {
      setSubmitting(false);
    }
  };

  const startEditFlow = (carga: CargaVendedor, targetEstado?: 'abierta' | 'cerrada' | 'cancelada') => {
    setCargaToEdit(carga);
    setVerifyPasswordVal('');
    setShowPassword(false);
    setTargetEditEstado(targetEstado || null);
    setPasswordModal(true);
  };

  const handleVerifyPasswordAndLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyPasswordVal) return;
    setVerifyingPassword(true);
    try {
      await api.post('/verify-password', { password: verifyPasswordVal }, { progressLabel: 'Verificando contraseña...' });
      
      // Password correct! Load route details
      const carga = cargaToEdit!;
      setEditingCargaId(carga.id);
      setExcelVendedorId(String(carga.usuario_id));
      setExcelFecha(carga.fecha);
      setExcelObservaciones(carga.observaciones || '');
      setExcelGasolina(String(carga.gasolina ?? 300));
      setExcelMerma(String(carga.merma ?? 50));
      setExcelEfectivoEntregado(String(carga.efectivo_entregado ?? 0));
      setExcelEstado(targetEditEstado || carga.estado);

      const selectedVendedorUser = vendedores.find(v => v.id === carga.usuario_id);
      const vendedorProfile = selectedVendedorUser?.vendedor;

      const loadedData = productos.map(p => {
        const detail = carga.detalles.find(d => d.producto_id === p.id);
        if (detail) {
          const subtotal = detail.cantidad_vendida * detail.precio_venta;
          return {
            producto_id: p.id,
            nombre: p.nombre,
            codigo: p.codigo,
            costo: Number(p.costo || 0),
            precio_venta: Number(detail.precio_venta),
            stock_actual: Number(p.stock_actual || 0),
            cantidad: detail.cantidad_salida,
            vendido: detail.cantidad_vendida,
            sobrante: detail.cantidad_salida - detail.cantidad_vendida,
            subtotal: subtotal,
            pago_vendedor: detail.pago_vendedor,
            precio_real: detail.cantidad_vendida > 0 ? Number(detail.precio_venta) - (detail.pago_vendedor / detail.cantidad_vendida) : Number(detail.precio_venta),
            inversion: detail.cantidad_vendida * Number(p.costo || 0),
            ganancia: subtotal - (detail.cantidad_vendida * Number(p.costo || 0)) - detail.pago_vendedor,
            original_cantidad: detail.cantidad_salida,
          };
        } else {
          return {
            producto_id: p.id,
            nombre: p.nombre,
            codigo: p.codigo,
            costo: Number(p.costo || 0),
            precio_venta: Number(p.precio_venta || 0),
            stock_actual: Number(p.stock_actual || 0),
            cantidad: 0,
            vendido: 0,
            sobrante: 0,
            subtotal: 0,
            pago_vendedor: 0,
            precio_real: Number(p.precio_venta || 0),
            inversion: 0,
            ganancia: 0,
            original_cantidad: 0,
          };
        }
      });

      setExcelData(loadedData);
      setPasswordModal(false);
      setActiveTab('nueva'); // Switch to Excel edit tab
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      alert(ax.response?.data?.message || 'Contraseña incorrecta, intente de nuevo.');
    } finally {
      setVerifyingPassword(false);
    }
  };

  const openCancelar = (id: number) => {
    setCargaToCancel(id);
    setCancelModal(true);
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingCargaId(null);
              initializeExcel(productos, null);
              setActiveTab('list');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'list'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <List size={16} /> Listado de Rutas
          </button>
          <button
            onClick={() => setActiveTab('nueva')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'nueva'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Grid size={16} /> {editingCargaId ? `Editando Ruta #${editingCargaId}` : 'Nueva Ruta (Excel)'}
          </button>
        </div>

        {activeTab === 'list' && (
          <button
            onClick={() => {
              setEditingCargaId(null);
              setExcelVendedorId('');
              setExcelFecha(toLocalDateString());
              setExcelObservaciones('');
              setExcelGasolina('300');
              setExcelMerma('50');
              setExcelEfectivoEntregado('0');
              setExcelEstado('abierta');
              initializeExcel(productos, null);
              setActiveTab('nueva');
            }}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover transition-colors"
          >
            <Plus size={16} /> Nueva ruta
          </button>
        )}
      </div>

      {activeTab === 'list' ? (
        <>
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
                    load(1, perPage, vendedorFilter, e.target.value, fechaInicioFilter, fechaFinFilter);
                  }}
                  className="w-full sm:w-auto pl-3 pr-8 py-1.5 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary sm:min-w-[120px]"
                >
                  <option value="">Todos los estados</option>
                  <option value="abierta">Abiertas</option>
                  <option value="cerrada">Cerradas</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <span className="text-xs text-text-secondary">Desde:</span>
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
                <span className="text-xs text-text-secondary">Hasta:</span>
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
                  load(1, Number(e.target.value), vendedorFilter, estadoFilter, fechaInicioFilter, fechaFinFilter);
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
                  <th className="px-4 py-3 text-right font-semibold text-text-secondary">Deuda</th>
                  <th className="px-4 py-3 text-right font-semibold text-text-secondary">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableLoading colSpan={7} label="Cargando rutas..." />
                ) : cargas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
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
                      <td className="px-4 py-3 text-right font-mono font-semibold text-danger tabular-nums">
                        {c.deuda ? formatCurrency(c.deuda) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right flex justify-end gap-1.5">
                        {c.estado === 'abierta' && (
                          <>
                            <button
                              onClick={() => startEditFlow(c, 'cerrada')}
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
                          onClick={() => startEditFlow(c)}
                          className="p-1.5 text-text-muted hover:text-orange-600 rounded transition-colors"
                          title="Editar ruta"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={async () => {
                            const r = await api.get(`/cargas/${c.id}`, { progressLabel: 'Cargando detalle de la ruta...' });
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
            <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-white flex-wrap gap-2 rounded-lg shadow-sm">
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
        </>
      ) : (
        /* Excel Table Route Creator */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white rounded-lg border border-border shadow-sm">
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1">Vendedor *</label>
              <select
                value={excelVendedorId}
                onChange={e => setExcelVendedorId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                required
              >
                <option value="">Seleccionar vendedor</option>
                {vendedores.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.vendedor?.tipo_pago ? `(${u.vendedor.tipo_pago === 'comision' ? `${u.vendedor.comision_porcentaje}% com.` : u.vendedor.tipo_pago})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1">Fecha de la Ruta *</label>
              <input
                type="date"
                value={excelFecha}
                onChange={e => setExcelFecha(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            {editingCargaId && (
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1">Estado de la Ruta</label>
                <select
                  value={excelEstado}
                  onChange={e => setExcelEstado(e.target.value as 'abierta' | 'cerrada' | 'cancelada')}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="cerrada">Cerrada (Concluido)</option>
                  <option value="abierta">Abierta (En Ruta)</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            )}
            <div className={editingCargaId ? 'md:col-span-1' : 'md:col-span-2'}>
              <label className="block text-sm font-semibold text-text-primary mb-1">Observaciones</label>
              <input
                type="text"
                placeholder="Notas u observaciones de esta ruta..."
                value={excelObservaciones}
                onChange={e => setExcelObservaciones(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Excel spreadsheet container */}
          <div className="bg-white rounded-lg border border-border shadow-md overflow-hidden">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="text-white text-xs font-bold uppercase border-b border-blue-900">
                    <th className="px-3 py-2 text-center border-r border-blue-800" style={{ backgroundColor: '#2b6cb0', width: '100px' }}>Cantidad</th>
                    <th className="px-3 py-2 text-center border-r border-blue-800" style={{ backgroundColor: '#2b6cb0', width: '80px' }}>Stock</th>
                    <th className="px-3 py-2 text-left border-r border-blue-800" style={{ backgroundColor: '#2b6cb0', minWidth: '220px' }}>Producto</th>
                    <th className="px-3 py-2 text-center border-r border-blue-800" style={{ backgroundColor: '#2b6cb0', width: '100px' }}>Vendido</th>
                    <th className="px-3 py-2 text-right border-r border-blue-800" style={{ backgroundColor: '#2b6cb0', width: '100px' }}>Precio</th>
                    <th className="px-3 py-2 text-right border-r border-blue-800" style={{ backgroundColor: '#2b6cb0', width: '120px' }}>Subtotal</th>
                    <th className="px-3 py-2 text-right border-r border-blue-800" style={{ backgroundColor: '#2b6cb0', width: '140px' }}>Pago Vendedor</th>
                    <th className="px-3 py-2 text-right border-r border-blue-800" style={{ backgroundColor: '#2b6cb0', width: '120px' }}>Precio Real</th>
                    <th className="px-3 py-2 text-center border-r border-blue-800" style={{ backgroundColor: '#2b6cb0', width: '100px' }}>Sobrante</th>
                    <th className="px-3 py-2 text-right border-r border-blue-800" style={{ backgroundColor: '#2b6cb0', width: '120px' }}>Inversión</th>
                    <th className="px-3 py-2 text-right" style={{ backgroundColor: '#2b6cb0', width: '120px' }}>Ganancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {excelData.map((row, idx) => {
                    const isRowFilled = row.cantidad > 0 || row.vendido > 0;
                    return (
                      <tr 
                        key={row.producto_id} 
                        className={`hover:bg-blue-50/40 transition-colors ${
                          isRowFilled ? 'bg-blue-50/20 font-medium' : ''
                        }`}
                      >
                        {/* CANTIDAD (SALIDA) */}
                        <td className="p-1 border-r border-gray-200 text-center">
                          <input
                            type="number"
                            min="0"
                            value={row.cantidad || ''}
                            placeholder="0"
                            onChange={e => updateExcelRow(idx, 'cantidad', e.target.value)}
                            onKeyDown={handleIntegerKeyDown}
                            onFocus={e => e.target.select()}
                            className="w-full px-1.5 py-1 text-center bg-transparent border-none focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary rounded font-semibold text-sm"
                          />
                        </td>
                        {/* STOCK */}
                        <td className="px-3 py-2 border-r border-gray-200 text-center font-mono font-semibold text-text-secondary">
                          {row.stock_actual}
                        </td>
                        {/* PRODUCTO */}
                        <td className="px-3 py-2 border-r border-gray-200 text-left text-text-primary">
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-text-secondary font-mono">{row.codigo}</span>
                            <span className="truncate">{row.nombre}</span>
                          </div>
                        </td>
                        {/* VENDIDO */}
                        <td className="p-1 border-r border-gray-200 text-center">
                          <input
                            type="number"
                            min="0"
                            value={row.vendido || ''}
                            placeholder="0"
                            disabled={editingCargaId === null}
                            onChange={e => updateExcelRow(idx, 'vendido', e.target.value)}
                            onKeyDown={handleIntegerKeyDown}
                            onFocus={e => e.target.select()}
                            className="w-full px-1.5 py-1 text-center bg-transparent border-none focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary rounded font-semibold text-sm text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                          />
                        </td>
                        {/* PRECIO */}
                        <td className="px-3 py-2 border-r border-gray-200 text-right font-mono text-text-secondary">
                          {formatCurrency(row.precio_venta)}
                        </td>
                        {/* SUBTOTAL */}
                        <td className="px-3 py-2 border-r border-gray-200 text-right font-mono font-semibold text-text-primary">
                          {row.subtotal > 0 ? formatCurrency(row.subtotal) : '—'}
                        </td>
                        {/* PAGO VENDEDOR */}
                        <td className="px-3 py-2 border-r border-gray-200 text-right font-mono text-text-secondary">
                          {row.pago_vendedor > 0 ? formatCurrency(row.pago_vendedor) : '—'}
                        </td>
                        {/* PRECIO REAL */}
                        <td className="px-3 py-2 border-r border-gray-200 text-right font-mono text-text-secondary">
                          {formatCurrency(row.precio_real)}
                        </td>
                        {/* SOBRANTE */}
                        <td className="px-3 py-2 border-r border-gray-200 text-center font-mono font-semibold text-text-secondary">
                          {row.cantidad > 0 ? row.sobrante : '—'}
                        </td>
                        {/* INVERSION */}
                        <td className="px-3 py-2 border-r border-gray-200 text-right font-mono text-text-secondary">
                          {row.inversion > 0 ? formatCurrency(row.inversion) : '—'}
                        </td>
                        {/* GANANCIA */}
                        <td className={`px-3 py-2 text-right font-mono font-semibold ${
                          row.ganancia > 0 ? 'text-success' : row.ganancia < 0 ? 'text-danger' : 'text-text-muted'
                        }`}>
                          {row.ganancia !== 0 ? formatCurrency(row.ganancia) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom summaries & fields panel */}
          <div className="bg-white rounded-lg border border-border shadow-md p-4 space-y-4">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-border pb-2">Resumen y Liquidación de Ruta</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Financial Inputs */}
              <div className="space-y-3 p-3 bg-surface rounded-lg border border-border">
                <h4 className="text-xs font-bold text-text-secondary uppercase">Deducciones y Gastos</h4>
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Gasto Gasolina ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={excelGasolina}
                    onChange={e => setExcelGasolina(e.target.value)}
                    onKeyDown={handleDecimalKeyDown}
                    className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Gasto Merma ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={excelMerma}
                    onChange={e => setExcelMerma(e.target.value)}
                    onKeyDown={handleDecimalKeyDown}
                    className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md font-semibold"
                  />
                </div>
              </div>

              {/* Cash Reconciliation */}
              <div className="space-y-3 p-3 bg-surface rounded-lg border border-border">
                <h4 className="text-xs font-bold text-text-secondary uppercase">Conciliación de Efectivo</h4>
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Efectivo Entregado por Vendedor ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={excelEfectivoEntregado}
                    disabled={editingCargaId === null}
                    onChange={e => setExcelEfectivoEntregado(e.target.value)}
                    onKeyDown={handleDecimalKeyDown}
                    onFocus={e => e.target.select()}
                    className={`w-full px-2.5 py-1.5 text-sm border rounded-md font-bold focus:ring-2 focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed ${
                      (parseFloat(excelEfectivoEntregado) || 0) > efectivoReal
                        ? 'border-danger text-danger focus:ring-danger'
                        : 'border-primary text-primary focus:ring-primary'
                    }`}
                  />
                  {(parseFloat(excelEfectivoEntregado) || 0) > efectivoReal && (
                    <span className="text-[10px] text-danger font-semibold block mt-1">
                      No puede ser mayor al efectivo esperado
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-text-muted">Efectivo Real</span>
                    <span className="text-sm font-mono font-bold text-text-primary">{formatCurrency(efectivoReal)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-text-muted">Deuda/Diferencia</span>
                    <span className={`text-sm font-mono font-bold ${deuda > 0 ? 'text-danger animate-pulse' : deuda < 0 ? 'text-success' : 'text-text-secondary'}`}>
                      {formatCurrency(deuda)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Route Summary Metrics */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50/30 rounded-lg border border-blue-100 text-sm">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-text-secondary">Productos Cargados</span>
                  <span className="text-lg font-bold font-mono text-text-primary">{totalCargados}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-text-secondary">Productos Vendidos</span>
                  <span className="text-lg font-bold font-mono text-primary">{totalVendidos}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-text-secondary">Subtotal de Venta</span>
                  <span className="text-lg font-bold font-mono text-text-primary">{formatCurrency(subtotalVenta)}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-text-secondary">Pago/Comisión Vendedor</span>
                  <span className="text-lg font-bold font-mono text-orange-600">{formatCurrency(gananciaVendedor)}</span>
                </div>
                <div className="col-span-2 border-t border-blue-200/60 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="block text-[10px] uppercase font-bold text-text-secondary">Ganancia Neta (Utilidad) de la Ruta</span>
                    <button
                      type="button"
                      onClick={() => setShowGananciaNeta(!showGananciaNeta)}
                      className="text-text-secondary hover:text-text-primary focus:outline-none"
                      title={showGananciaNeta ? "Ocultar ganancia neta" : "Mostrar ganancia neta"}
                    >
                      {showGananciaNeta ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {showGananciaNeta ? (
                    <>
                      <span className={`text-xl font-extrabold font-mono block ${gananciaNetaRuta >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(gananciaNetaRuta)}
                      </span>
                      <span className="block text-[9px] text-text-muted font-medium">
                        (Ganancia de productos: {formatCurrency(gananciaProductos)} - Gasolina: {formatCurrency(parseFloat(excelGasolina) || 0)} - Merma: {formatCurrency(parseFloat(excelMerma) || 0)})
                      </span>
                    </>
                  ) : (
                    <span className="text-xl font-extrabold font-mono text-text-muted block select-none">••••••</span>
                  )}
                </div>
              </div>

            </div>

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setCancelExcelModal(true)}
                className="px-5 py-2 text-sm font-semibold border border-border rounded-md hover:bg-surface transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGenerateRoute}
                disabled={submitting || !excelVendedorId || totalCargados === 0}
                className="px-6 py-2 text-sm font-bold bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed shadow transition-colors"
              >
                {submitting ? 'Guardando Ruta...' : editingCargaId ? 'Guardar Cambios de Ruta' : 'Generar y Guardar Ruta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password verification modal for editing */}
      <Modal isOpen={passwordModal} onClose={() => setPasswordModal(false)} title="Confirmar Identidad" size="sm">
        <form onSubmit={handleVerifyPasswordAndLoad} className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-full flex-shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-text-primary">Verificación Requerida</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Para editar la ruta <strong>#{cargaToEdit?.id}</strong>, por favor ingrese su contraseña para validar que es usted.
              </p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Contraseña de Usuario</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={verifyPasswordVal}
                onChange={e => setVerifyPasswordVal(e.target.value)}
                className="w-full pl-3 pr-10 py-2 text-sm border border-border rounded-md focus:ring-1 focus:ring-primary focus:outline-none bg-surface"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setPasswordModal(false)}
              className="px-3.5 py-1.5 text-xs font-semibold border border-border rounded hover:bg-surface"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={verifyingPassword}
              className="px-4 py-1.5 text-xs font-bold bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-60 transition-colors"
            >
              {verifyingPassword ? 'Verificando...' : 'Verificar y Editar'}
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

          {/* New financial details in the detail view */}
          {selectedCarga?.estado === 'cerrada' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-blue-50/20 rounded-lg border border-blue-100 text-xs">
              <div>
                <span className="block text-text-muted">Gasolina</span>
                <span className="font-semibold font-mono text-text-primary">{formatCurrency(selectedCarga.gasolina || 0)}</span>
              </div>
              <div>
                <span className="block text-text-muted">Merma</span>
                <span className="font-semibold font-mono text-text-primary">{formatCurrency(selectedCarga.merma || 0)}</span>
              </div>
              <div>
                <span className="block text-text-muted">Efectivo Real</span>
                <span className="font-semibold font-mono text-text-primary">{formatCurrency(selectedCarga.efectivo_real || 0)}</span>
              </div>
              <div>
                <span className="block text-text-muted">Efectivo Entregado</span>
                <span className="font-semibold font-mono text-text-primary">{formatCurrency(selectedCarga.efectivo_entregado || 0)}</span>
              </div>
              {selectedCarga.deuda ? (
                <div className="col-span-4 border-t border-blue-100/60 pt-2 flex justify-between">
                  <span className="text-text-secondary font-semibold">Deuda / Diferencia:</span>
                  <span className="font-bold font-mono text-danger">{formatCurrency(selectedCarga.deuda)}</span>
                </div>
              ) : null}
            </div>
          )}

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
                  await api.post(`/cargas/${cargaToCancel}/cancelar`, null, { progressLabel: 'Cancelando ruta...' });
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

      {/* Confirm cancel Excel mode Modal */}
      <Modal isOpen={cancelExcelModal} onClose={() => setCancelExcelModal(false)} title="Confirmar cancelación" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-full flex-shrink-0">
              <AlertTriangle size={20} />
            </div>
            <p className="text-sm text-text-secondary pt-1 leading-relaxed">
              ¿Está seguro de que desea cancelar? Se perderán todos los cambios realizados en esta ruta.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setCancelExcelModal(false)}
              className="px-4 py-2 text-xs font-semibold border border-border rounded hover:bg-surface"
            >
              No, continuar editando
            </button>
            <button
              onClick={() => {
                setCancelExcelModal(false);
                setEditingCargaId(null);
                initializeExcel(productos, null);
                setActiveTab('list');
              }}
              className="px-4 py-2 text-xs font-semibold bg-danger text-white rounded hover:bg-red-700 transition-colors"
            >
              Sí, descartar cambios
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
