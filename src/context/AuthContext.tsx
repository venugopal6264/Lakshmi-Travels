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
    // Navigate to the client login page; the form there will POST to /api/auth/login
    const target = '/login';
    if (window.location.pathname !== target) {
      window.history.pushState({}, '', target);
      // fire a popstate-equivalent for our lightweight router if needed
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
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
 
