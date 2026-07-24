import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import api from '../../api/axios';
import type { Vendedor, User } from '../../types';
import Modal from '../../components/ui/Modal';
import { tipoPagoLabel, periodoPagoLabel, formatCurrency } from '../../utils/formatters';
import { handleDecimalKeyDown } from '../../utils/keyboard';
import ClearFiltersButton from '../../components/ui/ClearFiltersButton';

export default function VendedoresPage() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vendedor | null>(null);
  const [form, setForm] = useState({
    usuario_id: '',
    tipo_pago: 'comision',
    salario_base: '',
    comision_porcentaje: '',
    comision_monto_fijo: '',
    periodo_pago: 'semanal',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pagination & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTipoPago, setFilterTipoPago] = useState('');
  const [filterPeriodoPago, setFilterPeriodoPago] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/vendedores');
      setVendedores(r.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    api.get('/users').then(r => setUsers(r.data));
  }, []);

  // Reset pagination on filter or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterTipoPago, filterPeriodoPago, perPage]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      usuario_id: '',
      tipo_pago: 'comision',
      salario_base: '',
      comision_porcentaje: '',
      comision_monto_fijo: '',
      periodo_pago: 'semanal',
    });
    setErrors({});
    setModalOpen(true);
  };
  const openEdit = (v: Vendedor) => {
    setEditing(v);
    setForm({
      usuario_id: String(v.usuario_id),
      tipo_pago: v.tipo_pago,
      salario_base: String(v.salario_base),
      comision_porcentaje: String(v.comision_porcentaje),
      comision_monto_fijo: String(v.comision_monto_fijo),
      periodo_pago: v.periodo_pago,
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      const data = {
        ...form,
        salario_base: parseFloat(form.salario_base) || 0,
        comision_porcentaje: parseFloat(form.comision_porcentaje) || 0,
        comision_monto_fijo: parseFloat(form.comision_monto_fijo) || 0,
        usuario_id: parseInt(form.usuario_id),
      };
      if (editing) await api.put(`/vendedores/${editing.id}`, data);
      else await api.post('/vendedores', data);
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { errors?: Record<string, string[]> } } };
      if (ax.response?.data?.errors) {
        const f: Record<string, string> = {};
        Object.entries(ax.response.data.errors).forEach(([k, v]) => {
          f[k] = v[0];
        });
        setErrors(f);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (v: Vendedor) => {
    if (!confirm(`¿Eliminar vendedor "${v.usuario?.name}"?`)) return;
    try {
      await api.delete(`/vendedores/${v.id}`);
      load();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      alert(ax.response?.data?.message || 'Error');
    }
  };

  // Filter & Paginate client-side
  const filteredVendedores = vendedores.filter(v => {
    const matchesSearch = v.usuario?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTipo = !filterTipoPago || v.tipo_pago === filterTipoPago;
    const matchesPeriodo = !filterPeriodoPago || v.periodo_pago === filterPeriodoPago;
    return matchesSearch && matchesTipo && matchesPeriodo;
  });

  const totalPages = Math.ceil(filteredVendedores.length / perPage);
  const paginatedVendedores = filteredVendedores.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Vendedores</h1>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-lg border border-border flex-wrap">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar vendedor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-surface/50"
            />
          </div>
          <div className="w-full sm:w-auto">
            <select
              value={filterTipoPago}
              onChange={e => setFilterTipoPago(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 text-sm border border-border rounded-md bg-white sm:min-w-[120px]"
            >
              <option value="">Todos los tipos de pago</option>
              <option value="fijo">Salario fijo</option>
              <option value="comision">Comisión</option>
              <option value="mixto">Mixto</option>
            </select>
          </div>
          <div className="w-full sm:w-auto">
            <select
              value={filterPeriodoPago}
              onChange={e => setFilterPeriodoPago(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 text-sm border border-border rounded-md bg-white sm:min-w-[120px]"
            >
              <option value="">Todos los periodos</option>
              <option value="diario">Diario</option>
              <option value="semanal">Semanal</option>
              <option value="quincenal">Quincenal</option>
              <option value="mensual">Mensual</option>
            </select>
          </div>
          <div className="w-full sm:w-auto flex justify-end">
            <ClearFiltersButton
              visible={!!(searchQuery || filterTipoPago || filterPeriodoPago)}
              onClick={() => {
                setSearchQuery('');
                setFilterTipoPago('');
                setFilterPeriodoPago('');
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-text-secondary">Filas por página:</span>
          <select
            value={perPage}
            onChange={e => setPerPage(Number(e.target.value))}
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
              <th className="px-4 py-3 text-left font-semibold text-text-secondary">Vendedor</th>
              <th className="px-4 py-3 text-left font-semibold text-text-secondary">Tipo de pago</th>
              <th className="px-4 py-3 text-left font-semibold text-text-secondary">Salario base</th>
              <th className="px-4 py-3 text-left font-semibold text-text-secondary">Comisión</th>
              <th className="px-4 py-3 text-left font-semibold text-text-secondary">Periodo</th>
              <th className="px-4 py-3 text-center font-semibold text-text-secondary">Estado</th>
              <th className="px-4 py-3 text-right font-semibold text-text-secondary">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-3">
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                </td>
              </tr>
            ) : paginatedVendedores.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                  No se encontraron vendedores.
                </td>
              </tr>
            ) : (
              paginatedVendedores.map(v => (
                <tr key={v.id} className="border-b border-border hover:bg-surface/50">
                  <td className="px-4 py-3 font-medium">{v.usuario?.name}</td>
                  <td className="px-4 py-3">{tipoPagoLabel(v.tipo_pago)}</td>
                  <td className="px-4 py-3 tabular-nums">{v.tipo_pago !== 'comision' ? formatCurrency(v.salario_base) : '—'}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {v.comision_porcentaje > 0
                      ? `${v.comision_porcentaje}%`
                      : v.comision_monto_fijo > 0
                      ? formatCurrency(v.comision_monto_fijo)
                      : '—'}
                  </td>
                  <td className="px-4 py-3">{periodoPagoLabel(v.periodo_pago)}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                        v.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {v.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(v)} className="p-1.5 text-text-muted hover:text-primary rounded">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(v)} className="p-1.5 text-text-muted hover:text-danger rounded">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Client-side Pagination Footer */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-surface/30 flex-wrap gap-2">
            <div className="text-xs text-text-secondary">
              Mostrando <span className="font-semibold">{(currentPage - 1) * perPage + 1}</span> a{' '}
              <span className="font-semibold">{Math.min(filteredVendedores.length, currentPage * perPage)}</span> de{' '}
              <span className="font-semibold">{filteredVendedores.length}</span> vendedores
            </div>
            <div className="flex gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-2.5 py-1 text-xs font-medium border border-border rounded hover:bg-surface bg-white disabled:opacity-40"
              >
                Anterior
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`px-2.5 py-1 text-xs font-semibold border rounded ${
                    currentPage === idx + 1
                      ? 'bg-primary border-primary text-white'
                      : 'border-border hover:bg-surface bg-white text-text-primary'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-2.5 py-1 text-xs font-medium border border-border rounded hover:bg-surface bg-white disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar vendedor' : 'Nuevo vendedor'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editing && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Usuario *</label>
              <select
                value={form.usuario_id}
                onChange={e => setForm({ ...form, usuario_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white"
                required
              >
                <option value="">Seleccionar usuario</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.username})
                  </option>
                ))}
              </select>
              {errors.usuario_id && <p className="text-xs text-danger mt-1">{errors.usuario_id}</p>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Tipo de pago *</label>
              <select
                value={form.tipo_pago}
                onChange={e => setForm({ ...form, tipo_pago: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white"
              >
                <option value="fijo">Salario fijo</option>
                <option value="comision">Comisión</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Periodo de pago *</label>
              <select
                value={form.periodo_pago}
                onChange={e => setForm({ ...form, periodo_pago: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white"
              >
                <option value="diario">Diario</option>
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
              </select>
            </div>
            {form.tipo_pago !== 'comision' && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Salario base *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.salario_base}
                  onChange={e => setForm({ ...form, salario_base: e.target.value })}
                  onFocus={e => e.target.select()}
                  onKeyDown={handleDecimalKeyDown}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md"
                  required
                />
              </div>
            )}
            {form.tipo_pago !== 'fijo' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Comisión porcentaje *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.comision_porcentaje}
                    onChange={e => setForm({ ...form, comision_porcentaje: e.target.value })}
                    onFocus={e => e.target.select()}
                    onKeyDown={handleDecimalKeyDown}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Comisión monto fijo *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.comision_monto_fijo}
                    onChange={e => setForm({ ...form, comision_monto_fijo: e.target.value })}
                    onFocus={e => e.target.select()}
                    onKeyDown={handleDecimalKeyDown}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md"
                  />
                </div>
              </>
            )}
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
              {submitting ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
