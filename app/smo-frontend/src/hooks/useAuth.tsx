import { createContext, useContext, useState, useEffect } from 'react';
import { registerAuthCallbacks } from '../lib/api';
import type { AuthContextValue, User } from '../types';

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('smo_token');
    const storedUser = localStorage.getItem('smo_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser) as User);
    }
    setReady(true);
  }, []);

  // Register callbacks so the API layer can update React state on token refresh or force-logout
  useEffect(() => {
    registerAuthCallbacks(
      () => {
        setToken(null);
        setUser(null);
      },
      (newToken: string, newRefreshToken: string) => {
        setToken(newToken);
        localStorage.setItem('smo_token', newToken);
        localStorage.setItem('smo_refresh_token', newRefreshToken);
      },
    );
  }, []);

  const login = (newToken: string, newUser: User, newRefreshToken?: string) => {
    localStorage.setItem('smo_token', newToken);
    localStorage.setItem('smo_user', JSON.stringify(newUser));
    if (newRefreshToken) localStorage.setItem('smo_refresh_token', newRefreshToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('smo_token');
    localStorage.removeItem('smo_refresh_token');
    localStorage.removeItem('smo_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
