'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tiktok-vf-auth');
      if (stored) {
        const { accessToken, refreshToken, user, tenant } = JSON.parse(stored);
        setAccessToken(accessToken);
        setRefreshToken(refreshToken);
        setUser(user);
        setTenant(tenant);
      }
    } catch {}
    setLoading(false);
  }, []);

  const saveAuth = (data: {
    accessToken: string;
    refreshToken: string;
    user: User;
    tenant: Tenant;
  }) => {
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
    setTenant(data.tenant);
    localStorage.setItem('tiktok-vf-auth', JSON.stringify(data));
  };

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    saveAuth(data);
  };

  const register = async (email: string, password: string, name?: string) => {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');
    saveAuth(data);
  };

  const logout = () => {
    // Call server to revoke refresh token
    if (accessToken) {
      fetch(`${API}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => {});
    }
    setUser(null);
    setTenant(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem('tiktok-vf-auth');
  };

  const refresh = async () => {
    if (!refreshToken) throw new Error('No refresh token');
    const res = await fetch(`${API}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json();
    if (!res.ok) {
      logout();
      throw new Error('Session expired');
    }
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    // Update stored data
    const stored = JSON.parse(localStorage.getItem('tiktok-vf-auth') || '{}');
    stored.accessToken = data.accessToken;
    stored.refreshToken = data.refreshToken;
    localStorage.setItem('tiktok-vf-auth', JSON.stringify(stored));
  };

  return (
    <AuthContext.Provider value={{ user, tenant, accessToken, refreshToken, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { API };
