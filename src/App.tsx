import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AlertProvider } from './contexts/AlertContext';
import MainLayout from './components/layout/MainLayout';
import TopProgressBar, { RouteLoadingIndicator } from './components/ui/TopProgressBar';
import PageLoader from './components/ui/PageLoader';
import TaskProgressToast from './components/ui/TaskProgressToast';
import LoginPage from './pages/auth/LoginPage';
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const ProductosPage = lazy(() => import('./pages/productos/ProductosPage'));
const CategoriasPage = lazy(() => import('./pages/categorias/CategoriasPage'));
const UnidadesMedidaPage = lazy(() => import('./pages/unidades/UnidadesMedidaPage'));
const InventarioPage = lazy(() => import('./pages/inventario/InventarioPage'));
const VendedoresPage = lazy(() => import('./pages/vendedores/VendedoresPage'));
const RutasPage = lazy(() => import('./pages/rutas/RutasPage'));
const LiquidacionesPage = lazy(() => import('./pages/liquidaciones/LiquidacionesPage'));
const ReportesPage = lazy(() => import('./pages/reportes/ReportesPage'));
const UsuariosPage = lazy(() => import('./pages/usuarios/UsuariosPage'));
const VendedorDashboardPage = lazy(() => import('./pages/vendedor/VendedorDashboardPage'));
const VentasDirectasPage = lazy(() => import('./pages/ventas/VentasDirectasPage'));

// Pantalla de arranque mientras se verifica la sesión (la barra superior también avanza)
const Spinner = () => (
  <RouteLoadingIndicator>
    <div className="h-screen w-full flex flex-col items-center justify-center gap-3 bg-surface">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"/>
      <p className="text-sm text-text-secondary animate-pulse">Cargando DeliGumy...</p>
    </div>
  </RouteLoadingIndicator>
);

function PrivateRoute({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { user, token, isLoading, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Spinner />;
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

  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
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
        <TopProgressBar />
        <TaskProgressToast />
        <Router>
          <AppRoutes />
        </Router>
      </AlertProvider>
    </AuthProvider>
  );
}

export default App;
