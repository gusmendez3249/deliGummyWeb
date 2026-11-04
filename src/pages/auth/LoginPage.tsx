import { useEffect, useState } from 'react';
import api from '../../api/axios';
import LoadingProgress from '../../components/ui/LoadingProgress';
import { getFriendlyErrorMessage } from '../../utils/friendlyError';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Precalentar el backend: en hosting gratuito el servidor se duerme, así que lo
  // despertamos en cuanto se abre el login (mientras el usuario escribe sus datos).
  useEffect(() => {
    api.get('/ping', { timeout: 90000, silent: true }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const slowTimer = setTimeout(() => setSlow(true), 4000);

    try {
      await login(username, password);
      navigate('/');
    } catch (err: unknown) {
      // Credenciales incorrectas, cuenta desactivada, sin internet, sistema iniciando...
      setError(getFriendlyErrorMessage(err, 'No pudimos iniciar tu sesión.'));
    } finally {
      clearTimeout(slowTimer);
      setSlow(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-text-primary">DeliGumy</h1>
          <p className="text-sm text-text-secondary mt-1">Sistema de gestion de inventario</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg border border-border shadow-sm p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-5">Iniciar sesion</h2>

          {error && (
            <div className="mb-4 p-3 bg-danger-light text-danger text-sm rounded-md border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-text-primary mb-1">
                Usuario
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Ingresa tu usuario"
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1">
                Contrasena
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Ingresa tu contrasena"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {loading ? 'Ingresando...' : 'Iniciar sesion'}
            </button>
            <LoadingProgress
              active={loading}
              label={(pct) =>
                pct < 40 ? 'Verificando credenciales...' :
                pct < 75 ? 'Cargando tu información...' :
                'Casi listo...'
              }
            />
            {slow && (
              <p className="text-xs text-text-secondary text-center">
                Estamos preparando todo para ti, esto puede tardar unos segundos...
              </p>
            )}
          </form>
        </div>

        <p className="text-xs text-text-muted text-center mt-4">
          DeliGumy Inventario v1.0
        </p>
      </div>
    </div>
  );
}
