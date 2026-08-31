/**
 * pages/change-password.jsx
 *
 * Forced password change on first login (must_change_password === true).
 * Also accessible voluntarily from any authenticated state.
 * Calls POST /api/auth/change-password, then redirects to dashboard.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import api, { setApiToken } from '../lib/api';

export default function ChangePasswordPage() {
  const { user, isLoading, isAuthenticated, updateUser, setToken } = useAuth();
  const router = useRouter();

  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (next !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    if (next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/change-password', {
        current_password: current,
        new_password:     next,
      });

      // Server returns a fresh token — update it in memory
      setApiToken(data.token);
      updateUser({ must_change_password: false });

      setSuccess('Password changed successfully! Redirecting…');
      setTimeout(() => router.replace('/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !isAuthenticated) return null;

  const isForced = user?.must_change_password;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">

        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-4xl">🔐</span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            {isForced ? 'Set your password' : 'Change password'}
          </h1>
          {isForced && (
            <p className="mt-1.5 text-sm text-gray-500">
              Your administrator set a temporary password. Please choose a new one to continue.
            </p>
          )}
        </div>

        <div className="card">
          {error && (
            <div className="alert-error mb-5">
              <span>⚠</span><span>{error}</span>
            </div>
          )}
          {success && (
            <div className="alert-success mb-5">
              <span>✓</span><span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Current password</label>
              <input type="password" required className="input"
                value={current} onChange={(e) => setCurrent(e.target.value)}
                placeholder="Your current password" autoComplete="current-password" />
            </div>

            <div>
              <label className="label">New password</label>
              <input type="password" required className="input"
                value={next} onChange={(e) => setNext(e.target.value)}
                placeholder="Minimum 8 characters" autoComplete="new-password" />
            </div>

            <div>
              <label className="label">Confirm new password</label>
              <input type="password" required className="input"
                value={confirm} onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat new password" autoComplete="new-password" />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? <><span className="spinner" />Changing…</> : 'Change password'}
            </button>

            {!isForced && (
              <button type="button" onClick={() => router.back()}
                className="btn-secondary w-full justify-center">
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
