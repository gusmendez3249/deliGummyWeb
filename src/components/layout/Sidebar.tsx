import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Package, Tag, Ruler, ArrowUpDown, Users, Truck,
  Receipt, BarChart3, UserCog, LogOut, Menu, X, ChevronLeft, ShoppingCart,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} />, roles: ['Administrador', 'Encargado', 'Vendedor'] },
  { to: '/productos', label: 'Productos', icon: <Package size={18} />, roles: ['Administrador', 'Encargado', 'Vendedor', 'Consulta'] },
  { to: '/categorias', label: 'Categorias', icon: <Tag size={18} />, roles: ['Administrador'] },
  { to: '/unidades-medida', label: 'Unidades de medida', icon: <Ruler size={18} />, roles: ['Administrador'] },
  { to: '/inventario', label: 'Inventario', icon: <ArrowUpDown size={18} />, roles: ['Administrador', 'Encargado'] },
  { to: '/ventas-directas', label: 'Ventas Directas', icon: <ShoppingCart size={18} />, roles: ['Administrador', 'Encargado'] },
  { to: '/vendedores', label: 'Vendedores', icon: <Users size={18} />, roles: ['Administrador'] },
  { to: '/rutas', label: 'Rutas del dia', icon: <Truck size={18} />, roles: ['Administrador', 'Encargado'] },
  { to: '/liquidaciones', label: 'Liquidaciones', icon: <Receipt size={18} />, roles: ['Administrador'] },
  { to: '/reportes', label: 'Reportes', icon: <BarChart3 size={18} />, roles: ['Administrador', 'Consulta'] },
  { to: '/usuarios', label: 'Usuarios', icon: <UserCog size={18} />, roles: ['Administrador'] },
];

export default function Sidebar() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredItems = navItems.filter((item) =>
    item.roles.some((role) => hasRole(role))
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-slate-700">
        {!collapsed && (
          <span className="text-white font-semibold text-lg tracking-tight">DeliGumy</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-white hidden lg:block p-1"
        >
          <ChevronLeft size={18} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          className="text-slate-400 hover:text-white lg:hidden p-1"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
        <ul className="space-y-0.5 px-2">
          {filteredItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-slate-300 hover:bg-sidebar-hover hover:text-white'
                  } ${collapsed ? 'justify-center' : ''}`
                }
                end={item.to === '/'}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-slate-700 p-3">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden">
            {user?.imagen_url ? (
              <img src={user.imagen_url} alt="" className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0).toUpperCase()
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.role?.nombre}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-400 p-1 flex-shrink-0"
            title="Cerrar sesion"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 bg-sidebar text-white p-2 rounded-md shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          bg-sidebar text-white
          transition-all duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'w-16' : 'w-60'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
