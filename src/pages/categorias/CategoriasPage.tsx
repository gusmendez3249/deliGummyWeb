import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import api from '../../api/axios';
import type { Categoria } from '../../types';
import Modal from '../../components/ui/Modal';
import TableLoading from '../../components/ui/TableLoading';

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pagination & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/categorias');
      setCategorias(r.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Reset pagination on search or row size change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, perPage]);

  const openCreate = () => {
    setEditing(null);
    setForm({ nombre: '', descripcion: '' });
    setErrors({});
    setModalOpen(true);
  };
  const openEdit = (c: Categoria) => {
    setEditing(c);
    setForm({ nombre: c.nombre, descripcion: c.descripcion || '' });
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      if (editing) {
        await api.put(`/categorias/${editing.id}`, form, { progressLabel: 'Actualizando categoría...' });
      } else {
        await api.post('/categorias', form, { progressLabel: 'Guardando categoría...' });
      }
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

  const handleDelete = async (c: Categoria) => {
    if (!confirm(`¿Eliminar "${c.nombre}"?`)) return;
    try {
      await api.delete(`/categorias/${c.id}`, { progressLabel: 'Eliminando categoría...' });
      load();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      alert(ax.response?.data?.message || 'Error al eliminar.');
    }
  };

  // Filter & Paginate items client-side
  const filteredCategorias = categorias.filter(
    c =>
      c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.descripcion && c.descripcion.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredCategorias.length / perPage);
  const paginatedCategorias = filteredCategorias.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Categorias</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover"
        >
          <Plus size={16} /> Nueva categoria
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-lg border border-border">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar categoria..."
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
              <th className="px-4 py-3 text-left font-semibold text-text-secondary">Descripcion</th>
              <th className="px-4 py-3 text-center font-semibold text-text-secondary">Productos</th>
              <th className="px-4 py-3 text-right font-semibold text-text-secondary">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableLoading colSpan={4} label="Cargando categorías..." rows={3} />
            ) : paginatedCategorias.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-text-muted">
                  No se encontraron categorias.
                </td>
              </tr>
            ) : (
              paginatedCategorias.map(c => (
                <tr key={c.id} className="border-b border-border hover:bg-surface/50">
                  <td className="px-4 py-3 font-medium">{c.nombre}</td>
                  <td className="px-4 py-3 text-text-secondary">{c.descripcion || '—'}</td>
                  <td className="px-4 py-3 text-center tabular-nums">{c.productos_count ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-text-muted hover:text-primary rounded">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(c)} className="p-1.5 text-text-muted hover:text-danger rounded">
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
              <span className="font-semibold">{Math.min(filteredCategorias.length, currentPage * perPage)}</span> de{' '}
              <span className="font-semibold">{filteredCategorias.length}</span> categorias
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar categoria' : 'Nueva categoria'} size="sm">
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
            <label className="block text-sm font-medium text-text-primary mb-1">Descripcion</label>
            <input
              value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded-md"
            />
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
