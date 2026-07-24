import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import api from '../../api/axios';
import type { UnidadMedida } from '../../types';
import Modal from '../../components/ui/Modal';

export default function UnidadesMedidaPage() {
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UnidadMedida | null>(null);
  const [form, setForm] = useState({ nombre: '', abreviatura: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pagination & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/unidades-medida');
      setUnidades(r.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Reset pagination on filter or row limit change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, perPage]);

  const openCreate = () => {
    setEditing(null);
    setForm({ nombre: '', abreviatura: '' });
    setErrors({});
    setModalOpen(true);
  };
  const openEdit = (u: UnidadMedida) => {
    setEditing(u);
    setForm({ nombre: u.nombre, abreviatura: u.abreviatura });
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      if (editing) await api.put(`/unidades-medida/${editing.id}`, form);
      else await api.post('/unidades-medida', form);
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

  const handleDelete = async (u: UnidadMedida) => {
    if (!confirm(`¿Eliminar "${u.nombre}"?`)) return;
    try {
      await api.delete(`/unidades-medida/${u.id}`);
      load();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      alert(ax.response?.data?.message || 'Error');
    }
  };

  // Filter & Paginate items client-side
  const filteredUnidades = unidades.filter(
    u =>
      u.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.abreviatura.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUnidades.length / perPage);
  const paginatedUnidades = filteredUnidades.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Unidades de medida</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover"
        >
          <Plus size={16} /> Nueva unidad
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-lg border border-border">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar unidad..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-surface/50"
          />
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
              <th className="px-4 py-3 text-left font-semibold text-text-secondary">Nombre</th>
              <th className="px-4 py-3 text-left font-semibold text-text-secondary">Abreviatura</th>
              <th className="px-4 py-3 text-center font-semibold text-text-secondary">Productos</th>
              <th className="px-4 py-3 text-right font-semibold text-text-secondary">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-4 py-3" colSpan={4}>
                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : paginatedUnidades.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-text-muted">
                  No se encontraron unidades.
                </td>
              </tr>
            ) : (
              paginatedUnidades.map(u => (
                <tr key={u.id} className="border-b border-border hover:bg-surface/50">
                  <td className="px-4 py-3 font-medium">{u.nombre}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-surface rounded text-xs font-mono">{u.abreviatura}</span>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums">{u.productos_count ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(u)} className="p-1.5 text-text-muted hover:text-primary rounded">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(u)} className="p-1.5 text-text-muted hover:text-danger rounded">
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
              <span className="font-semibold">{Math.min(filteredUnidades.length, currentPage * perPage)}</span> de{' '}
              <span className="font-semibold">{filteredUnidades.length}</span> unidades
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar unidad' : 'Nueva unidad'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Nombre *</label>
            <input
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded-md"
              required
            />
            {errors.nombre && <p className="text-xs text-danger mt-1">{errors.nombre}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Abreviatura *</label>
            <input
              value={form.abreviatura}
              onChange={e => setForm({ ...form, abreviatura: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded-md"
              required
            />
            {errors.abreviatura && <p className="text-xs text-danger mt-1">{errors.abreviatura}</p>}
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border border-border rounded-md hover:bg-surface">
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
