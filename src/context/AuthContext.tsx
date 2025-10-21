import React, { createContext, useEffect, useRef, useState } from 'react';

const AUTH_CACHE_KEY = 'auth:user';
const AUTH_TIMEOUT_MS = 8000; // 8s timeout for /api/auth/me

export interface AuthUser {
  name?: string;
  role?: string;
  picture?: string;
  email?: string;
  [k: string]: unknown;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function fetchWithTimeout(input: RequestInfo, init: RequestInit = {}, timeout = AUTH_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = window.setTimeout(() => controller.abort(), timeout);
  const merged: RequestInit = { ...init, signal: controller.signal, credentials: 'include' };
  return fetch(input, merged).finally(() => window.clearTimeout(id));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const setCachedUser = (u: AuthUser | null) => {
    if (u) localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(u));
    else localStorage.removeItem(AUTH_CACHE_KEY);
  };

  const refresh = async () => {
    try {
      const res = await fetchWithTimeout('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (!mounted.current) return;
        setUser(data || null);
        setCachedUser(data || null);
      } else {
        if (!mounted.current) return;
        setUser(null);
        setCachedUser(null);
      }
    } catch (err) {
      console.warn('Auth refresh failed (timeout/network). Using cached user. Retrying…', err);
      // Retry once after short delay in background
      setTimeout(async () => {
        try {
          const r2 = await fetchWithTimeout('/api/auth/me');
          if (!mounted.current) return;
          if (r2.ok) {
            const data2 = await r2.json();
            setUser(data2 || null);
            setCachedUser(data2 || null);
          }
        } catch (err2) {
          console.warn('Auth refresh retry failed:', err2);
        }
      }, 1500);
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    // Fast path: use cached user immediately, then revalidate in background
    try {
      const cached = localStorage.getItem(AUTH_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as AuthUser;
        setUser(parsed);
        setLoading(false); // allow app to render immediately
      }
    } catch (err) {
      console.warn('Failed to parse cached auth user', err);
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.warn('Logout request failed:', err);
    }
    setCachedUser(null);
    if (mounted.current) setUser(null);
  };

  const value: AuthContextValue = { user, loading, refresh, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Removed useAuthContext helper to avoid non-component exports in this file

