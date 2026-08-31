/**
 * context/AuthContext.jsx
 *
 * Global auth state for the entire app.
 *
 * Provides:
 *   user          — { id, name, email, role, business_id, must_change_password } | null
 *   token         — current access token string | null
 *   isLoading     — true while we're checking session on first load
 *   login(data)   — call after a successful POST /auth/login response
 *   logout()      — clears state, calls POST /auth/logout, redirects to /login
 *
 * On mount: calls POST /auth/refresh to restore session from the httpOnly cookie.
 * This is how the frontend "remembers" the user across page refreshes.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import api, { setApiToken, clearApiToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();

  const [user,      setUser]      = useState(null);
  const [token,     setToken]     = useState(null);
  const [isLoading, setIsLoading] = useState(true);  // true until first refresh attempt completes

  // ── Restore session from httpOnly cookie on first load ──────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      // Don't attempt refresh if account is flagged as suspended (prevents redirect loop)
      if (typeof window !== 'undefined' && sessionStorage.getItem('rb_suspended') === '1') {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await api.post('/auth/refresh');
        setApiToken(data.token);
        setToken(data.token);
        setUser(data.user);
      } catch {
        // No valid cookie → user is logged out, that's fine
        clearApiToken();
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // ── login: called after POST /auth/login succeeds ──────────────────────────
  const login = useCallback((responseData) => {
    setApiToken(responseData.token);
    setToken(responseData.token);
    setUser(responseData.user);
  }, []);

  // ── logout: clear state, revoke server-side token, redirect ────────────────
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore — cookie will expire naturally
    } finally {
      clearApiToken();
      setToken(null);
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  // ── Update user in state (e.g. after change-password sets must_change_password:false) ──
  const updateUser = useCallback((partial) => {
    setUser((prev) => prev ? { ...prev, ...partial } : prev);
  }, []);

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ────────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
