import React, { createContext, useEffect, useState } from 'react';
import { apiService } from '../services/api';

type User = { sub: string; name?: string; email?: string; picture?: string } | null;

interface AuthContextValue {
  user: User;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiService.getCurrentUser();
        if (!cancelled) setUser(res.user);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = () => {
    // Redirect to server login endpoint; include current path for post-login return
    const redirect = encodeURIComponent(window.location.pathname || '/');
    window.location.href = `${import.meta.env?.VITE_API_URL || 'http://localhost:5050/api'}/auth/login?redirect=${redirect}`;
  };

  const logout = async () => {
    await apiService.logout();
    setUser(null);
    // Optional: refresh to clear any state
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export default AuthProvider;
 
