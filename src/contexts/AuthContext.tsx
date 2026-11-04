import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api/axios';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  isEncargado: () => boolean;
  isVendedor: () => boolean;
  isConsulta: () => boolean;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const res = await api.get('/me');
      setUser(res.data);
    } catch {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    // El login tiene su propia barra de progreso en la pantalla
    const res = await api.post('/login', { username, password }, { progressLabel: false });
    const { user: userData, token: tokenData } = res.data;
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem('auth_token', tokenData);
    localStorage.setItem('auth_user', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      await api.post('/logout', null, { progressLabel: 'Cerrando sesión...' });
    } catch {
      // Silently fail if backend is unreachable
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  };

  const hasRole = (...roles: string[]) => {
    if (!user) return false;
    return roles.includes(user.role.nombre);
  };

  const isAdmin = () => hasRole('Administrador');
  const isEncargado = () => hasRole('Encargado');
  const isVendedor = () => hasRole('Vendedor');
  const isConsulta = () => hasRole('Consulta');

  return (
    <AuthContext.Provider value={{
      user, token, isLoading,
      login, logout,
      isAdmin, isEncargado, isVendedor, isConsulta, hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
