/**
 * ChangePasswordModal.jsx
 * Inline modal — opens from the Sidebar account dropdown.
 * Calls POST /api/auth/change-password, updates token in AuthContext on success.
 */

import { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function ChangePasswordModal({ isOpen, onClose }) {
  const { setAccessToken } = useAuth();

  const [form, setForm] = useState({
    current_password:  '',
    new_password:      '',
    confirm_password:  '',
  });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setForm({ current_password: '', new_password: '', confirm_password: '' });
    setError('');
    setSuccess(false);
    onClose();
  };

  const handleChange = (e) => {
    setError('');
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.new_password.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setError('New passwords do not match.');
      return;
    }
    if (form.current_password === form.new_password) {
      setError('New password must be different from your current password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/change-password', {
        current_password: form.current_password,
        new_password:     form.new_password,
      });

      // Backend rotates the access token on password change — update in context
      if (res.data?.access_token) {
        setAccessToken(res.data.access_token);
      }

      setSuccess(true);
      setTimeout(() => handleClose(), 2000);

    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Change Password</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Success state */}
        {success ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-400 font-medium">Password changed successfully!</p>
            <p className="text-gray-500 text-sm">Closing…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-sm text-gray-400 mb-1">Current Password</label>
              <input
                type="password"
                name="current_password"
                value={form.current_password}
                onChange={handleChange}
                autoComplete="current-password"
                required
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">New Password</label>
              <input
                type="password"
                name="new_password"
                value={form.new_password}
                onChange={handleChange}
                autoComplete="new-password"
                required
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Min. 8 characters"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Confirm New Password</label>
              <input
                type="password"
                name="confirm_password"
                value={form.confirm_password}
                onChange={handleChange}
                autoComplete="new-password"
                required
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Repeat new password"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors text-sm"
              >
                {loading ? 'Saving…' : 'Save Password'}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}