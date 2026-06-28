'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface User { id: string; email: string; name: string; status: string; locale: string; timezone: string; avatarUrl?: string; }

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (data: Partial<User> & { currentPassword?: string; newPassword?: string }) => Promise<void>;
}

const C = createContext<AuthState>({ user: null, token: null, loading: true, login: async () => {}, register: async () => {}, logout: async () => {}, refresh: async () => {}, updateProfile: async () => {} });
export const useAuth = () => useContext(C);

async function api(path: string, opts: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const res = await fetch('/api' + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers as any },
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || d.message || 'Request failed');
  return d.data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('auth_token');
    if (t) { setToken(t); fetchUser(t); }
    else setLoading(false);
  }, []);

  async function fetchUser(t: string) {
    try {
      const u = await api('/auth/me', { headers: { Authorization: `Bearer ${t}` } });
      setUser(u); setToken(t);
    } catch { localStorage.removeItem('auth_token'); setToken(null); setUser(null); }
    finally { setLoading(false); }
  }

  const login = useCallback(async (email: string, password: string) => {
    const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem('auth_token', r.token); setToken(r.token); setUser(r.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const r = await api('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) });
    localStorage.setItem('auth_token', r.token); setToken(r.token); setUser(r.user);
  }, []);

  const logout = useCallback(async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch {}
    localStorage.removeItem('auth_token'); setToken(null); setUser(null);
  }, []);

  const refresh = useCallback(async () => { if (token) await fetchUser(token); }, [token]);

  const updateProfile = useCallback(async (data: any) => {
    const u = await api('/auth/me', { method: 'PATCH', body: JSON.stringify(data) });
    setUser(u);
  }, []);

  return <C.Provider value={{ user, token, loading, login, register, logout, refresh, updateProfile }}>{children}</C.Provider>;
}
