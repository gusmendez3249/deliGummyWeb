import { type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AlertProvider } from './contexts/AlertContext';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProductosPage from './pages/productos/ProductosPage';
import CategoriasPage from './pages/categorias/CategoriasPage';
import UnidadesMedidaPage from './pages/unidades/UnidadesMedidaPage';
import InventarioPage from './pages/inventario/InventarioPage';
import VendedoresPage from './pages/vendedores/VendedoresPage';
import RutasPage from './pages/rutas/RutasPage';
import LiquidacionesPage from './pages/liquidaciones/LiquidacionesPage';
import ReportesPage from './pages/reportes/ReportesPage';
import UsuariosPage from './pages/usuarios/UsuariosPage';
import VendedorDashboardPage from './pages/vendedor/VendedorDashboardPage';
import VentasDirectasPage from './pages/ventas/VentasDirectasPage';

function PrivateRoute({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { user, token, isLoading, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-surface"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"/></div>;
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0) {
    const hasRequiredRole = roles.some(r => hasRole(r));
    if (!hasRequiredRole) {
      return <div className="p-8 text-center"><h2 className="text-xl font-semibold text-danger">Acceso denegado</h2><p className="text-text-secondary mt-2">No tienes permisos para ver esta pagina.</p></div>;
    }
  }

  return children;
}

function Home() {
  const { user } = useAuth();
  if (user?.role?.nombre === 'Administrador' || user?.role?.nombre === 'Encargado') {
    return <DashboardPage />;
  }
  if (user?.role?.nombre === 'Consulta') {
    return <Navigate to="/reportes" replace />;
  }
  if (user?.role?.nombre === 'Vendedor') {
    return <VendedorDashboardPage />;
  }
  return <div className="p-8">Rol no configurado.</div>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        <Route index element={<Home />} />
        <Route path="productos" element={<PrivateRoute roles={['Administrador', 'Encargado', 'Vendedor', 'Consulta']}><ProductosPage /></PrivateRoute>} />
        <Route path="categorias" element={<PrivateRoute roles={['Administrador']}><CategoriasPage /></PrivateRoute>} />
        <Route path="unidades-medida" element={<PrivateRoute roles={['Administrador']}><UnidadesMedidaPage /></PrivateRoute>} />
        <Route path="inventario" element={<PrivateRoute roles={['Administrador', 'Encargado']}><InventarioPage /></PrivateRoute>} />
        <Route path="vendedores" element={<PrivateRoute roles={['Administrador']}><VendedoresPage /></PrivateRoute>} />
        <Route path="rutas" element={<PrivateRoute roles={['Administrador', 'Encargado']}><RutasPage /></PrivateRoute>} />
        <Route path="liquidaciones" element={<PrivateRoute roles={['Administrador']}><LiquidacionesPage /></PrivateRoute>} />
        <Route path="reportes" element={<PrivateRoute roles={['Administrador', 'Consulta']}><ReportesPage /></PrivateRoute>} />
        <Route path="usuarios" element={<PrivateRoute roles={['Administrador']}><UsuariosPage /></PrivateRoute>} />
        <Route path="ventas-directas" element={<PrivateRoute roles={['Administrador', 'Encargado']}><VentasDirectasPage /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AlertProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AlertProvider>
    </AuthProvider>
  );
}

export default App;
