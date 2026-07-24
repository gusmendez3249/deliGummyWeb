import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Search } from 'lucide-react';
import api from '../../api/axios';
import type { User, Role } from '../../types';
import Modal from '../../components/ui/Modal';
import ImageCapture from '../../components/ui/ImageCapture';
import { useAuth } from '../../contexts/AuthContext';
import { handleDecimalKeyDown } from '../../utils/keyboard';
import ClearFiltersButton from '../../components/ui/ClearFiltersButton';

function SafeAvatar({ src, fallbackText }: { src: string | null; fallbackText: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return <span className="text-text-secondary font-semibold">{fallbackText}</span>;
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

export default function UsuariosPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({
    role_id: '',
    name: '',
    username: '',
    email: '',
    password: '',
    telefono: '',
    tipo_pago: 'fijo',
    salario_base: '',
    comision_porcentaje: '',
    comision_monto_fijo: '',
    periodo_pago: 'semanal',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  // Pagination & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterActivo, setFilterActivo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/users');
      setUsers(r.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    api.get('/roles').then(r => setRoles(r.data));
  }, []);

  // Reset pagination on filter or row limit change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRole, filterActivo, perPage]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      role_id: '',
      name: '',
      username: '',
      email: '',
      password: '',
      telefono: '',
      tipo_pago: 'fijo',
      salario_base: '',
      comision_porcentaje: '',
      comision_monto_fijo: '',
      periodo_pago: 'semanal',
    });
    setImageFile(null);
    setImagePreview(null);
    setErrors({});
    setShowPassword(false);
    setModalOpen(true);
  };
  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      role_id: String(u.role_id),
      name: u.name,
      username: u.username,
      email: u.email,
      password: '',
      telefono: u.telefono || '',
      tipo_pago: u.vendedor?.tipo_pago || 'fijo',
      salario_base: u.vendedor?.salario_base ? String(u.vendedor.salario_base) : '',
      comision_porcentaje: u.vendedor?.comision_porcentaje ? String(u.vendedor.comision_porcentaje) : '',
      comision_monto_fijo: u.vendedor?.comision_monto_fijo ? String(u.vendedor.comision_monto_fijo) : '',
      periodo_pago: u.vendedor?.periodo_pago || 'semanal',
    });
    setImageFile(null);
    setImagePreview(u.imagen_url);
    setErrors({});
    setShowPassword(false);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v) fd.append(k, v);
      });
      if (imageFile) fd.append('imagen', imageFile);
      if (editing) {
        await api.post(`/users/${editing.id}/update`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/users', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
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

  const handleDelete = async (u: User) => {
    if (!confirm(`¿Eliminar "${u.name}"?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      load();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      alert(ax.response?.data?.message || 'Error');
    }
  };

  // Filter & Paginate items client-side
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = !filterRole || String(u.role_id) === filterRole;
    
    const matchesActivo =
      !filterActivo ||
      (filterActivo === 'activo' && u.activo) ||
      (filterActivo === 'inactivo' && !u.activo);

    return matchesSearch && matchesRole && matchesActivo;
  });

  const totalPages = Math.ceil(filteredUsers.length / perPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Usuarios</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover"
        >
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-lg border border-border flex-wrap">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar usuario..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-surface/50"
            />
          </div>
          <div className="w-full sm:w-auto">
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 text-sm border border-border rounded-md bg-white sm:min-w-[120px]"
            >
              <option value="">Todos los roles</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-auto">
            <select
              value={filterActivo}
              onChange={e => setFilterActivo(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 text-sm border border-border rounded-md bg-white sm:min-w-[120px]"
            >
              <option value="">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>
          </div>
          <div className="w-full sm:w-auto flex justify-end">
            <ClearFiltersButton
              visible={!!(searchQuery || filterRole || filterActivo)}
              onClick={() => {
                setSearchQuery('');
                setFilterRole('');
                setFilterActivo('');
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
              <th className="px-4 py-3 text-left font-semibold text-text-secondary w-12"></th>
              <th className="px-4 py-3 text-left font-semibold text-text-secondary">Nombre</th>
              <th className="px-4 py-3 text-left font-semibold text-text-secondary">Usuario</th>
              <th className="px-4 py-3 text-left font-semibold text-text-secondary">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-text-secondary">Rol</th>
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
            ) : paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                  No se encontraron usuarios.
                </td>
              </tr>
            ) : (
              paginatedUsers.map(u => (
                <tr key={u.id} className="border-b border-border hover:bg-surface/50">
                  <td className="px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs overflow-hidden">
                      <SafeAvatar src={u.imagen_url} fallbackText={u.name.charAt(0).toUpperCase()} />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{u.username}</td>
                  <td className="px-4 py-3 text-text-secondary">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-primary-light text-primary text-xs font-medium rounded">
                      {u.role?.nombre}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                        u.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1.5 text-text-muted hover:text-primary rounded"
                      title="Editar"
                    >
                      <Pencil size={15} />
                    </button>
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDelete(u)}
                        className="p-1.5 text-text-muted hover:text-danger rounded"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
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
              <span className="font-semibold">{Math.min(filteredUsers.length, currentPage * perPage)}</span> de{' '}
              <span className="font-semibold">{filteredUsers.length}</span> usuarios
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar usuario' : 'Nuevo usuario'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Nombre *</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-md"
                required
              />
              {errors.name && <p className="text-xs text-danger mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Usuario *</label>
              <input
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-md"
                required
              />
              {errors.username && <p className="text-xs text-danger mt-1">{errors.username}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-md"
                required
              />
              {errors.email && <p className="text-xs text-danger mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                {editing ? 'Contraseña (dejar en blanco para no cambiar)' : 'Contraseña *'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 pr-10 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  {...(!editing ? { required: true } : {})}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-danger mt-1">{errors.password}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Rol *</label>
              <select
                value={form.role_id}
                onChange={e => setForm({ ...form, role_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white"
                required
              >
                <option value="">Seleccionar</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Teléfono</label>
              <input
                value={form.telefono}
                onChange={e => setForm({ ...form, telefono: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-md"
              />
            </div>
          </div>

          {/* Vendedor profile sub-form */}
          {roles.find(r => String(r.id) === form.role_id)?.nombre === 'Vendedor' && (
            <div className="bg-surface/50 p-4 rounded-lg border border-border space-y-4">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Esquema de Pago del Vendedor</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Tipo de pago *</label>
                  <select
                    value={form.tipo_pago}
                    onChange={e => setForm({ ...form, tipo_pago: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-border rounded-md bg-white focus:outline-none"
                  >
                    <option value="fijo">Salario fijo</option>
                    <option value="comision">Comisión</option>
                    <option value="mixto">Mixto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Periodo de pago *</label>
                  <select
                    value={form.periodo_pago}
                    onChange={e => setForm({ ...form, periodo_pago: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-border rounded-md bg-white focus:outline-none"
                  >
                    <option value="diario">Diario</option>
                    <option value="semanal">Semanal</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="mensual">Mensual</option>
                  </select>
                </div>
                {form.tipo_pago !== 'comision' && (
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">Salario base *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.salario_base}
                      onChange={e => setForm({ ...form, salario_base: e.target.value })}
                      onFocus={e => e.target.select()}
                      onKeyDown={handleDecimalKeyDown}
                      className="w-full px-3 py-1.5 text-xs border border-border rounded-md focus:outline-none"
                      required
                    />
                  </div>
                )}
                {form.tipo_pago !== 'fijo' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1">Comisión % *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={form.comision_porcentaje}
                        onChange={e => setForm({ ...form, comision_porcentaje: e.target.value })}
                        onFocus={e => e.target.select()}
                        onKeyDown={handleDecimalKeyDown}
                        className="w-full px-3 py-1.5 text-xs border border-border rounded-md focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1">Comisión fija *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.comision_monto_fijo}
                        onChange={e => setForm({ ...form, comision_monto_fijo: e.target.value })}
                        onFocus={e => e.target.select()}
                        onKeyDown={handleDecimalKeyDown}
                        className="w-full px-3 py-1.5 text-xs border border-border rounded-md focus:outline-none"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Foto de perfil</label>
            <ImageCapture
              imagePreview={imagePreview}
              onImageSelected={(file, previewUrl) => {
                setImageFile(file);
                setImagePreview(previewUrl);
              }}
              captureMode="user"
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
              {submitting ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
