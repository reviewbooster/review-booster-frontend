/**
 * pages/dashboard/win-back.jsx
 * "Bring them back" â€” one generic inactivity reminder that works the same
 * way for every business type. Owner sets a threshold + message text;
 * this page lists who's due. Sending is still manual â€” a pre-filled
 * WhatsApp link, same pattern as everywhere else in the app.
 */
import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';

function fmtDate(d) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysSince(d) {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / (24 * 60 * 60 * 1000));
}

function WinBackPage() {
  const [settings, setSettings] = useState(null);
  const [due,      setDue]      = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  const [enabled,      setEnabled]      = useState(false);
  const [inactiveDays, setInactiveDays] = useState(30);
  const [messageText,  setMessageText]  = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/win-back/due');
      setDue(res.data.data || []);
      const s = res.data.settings;
      setSettings(s);
      setEnabled(s.enabled);
      setInactiveDays(s.inactive_days);
      setMessageText(s.message_text);
    } catch (e) {
      setError('Failed to load win-back info.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(function() { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.patch('/win-back/settings', {
        enabled,
        inactive_days: Number(inactiveDays),
        message_text: messageText,
      });
      setSaved(true);
      setTimeout(function() { setSaved(false); }, 2000);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  function whatsappUrl(customer) {
    var msg = messageText.replace(/\{name\}/g, customer.name);
    var phone = customer.phone.replace(/^\+/, '');
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg);
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Win-Back Reminders</h1>
        <p className="page-subtitle">Remind customers who haven't been back in a while \u2014 works the same for any type of business.</p>
      </div>

      {error && <div className="alert-error mb-5"><span>!</span><span>{error}</span></div>}

      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Enable win-back reminders</p>
            <p className="text-xs text-gray-400 mt-0.5">When on, customers show up below once they cross your threshold.</p>
          </div>
          <button
            type="button"
            onClick={function() { setEnabled(function(v) { return !v; }); }}
            className={'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 shrink-0 ' + (enabled ? 'bg-purple-600' : 'bg-gray-300')}
          >
            <span className={'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ' + (enabled ? 'translate-x-6' : 'translate-x-1')} />
          </button>
        </div>

        <div className="mb-4">
          <label className="label">Remind after (days since last activity)</label>
          <input
            className="input" type="number" min="1"
            value={inactiveDays}
            onChange={function(e) { setInactiveDays(e.target.value); }}
          />
        </div>

        <div className="mb-4">
          <label className="label">Message (use {'{name}'} for the customer's name)</label>
          <textarea
            className="input"
            rows={3}
            maxLength={500}
            value={messageText}
            onChange={function(e) { setMessageText(e.target.value); }}
          />
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center">
          {saving ? 'Saving...' : saved ? '\u2713 Saved' : 'Save Settings'}
        </button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-900">Customers Due</h2>
        {!loading && <span className="text-xs text-gray-400">{due.length} customer{due.length === 1 ? '' : 's'}</span>}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map(function(_, i) {
            return <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />;
          })}
        </div>
      ) : !enabled ? (
        <div className="card">
          <div className="empty-state">
            <p className="empty-icon">{'\uD83D\uDCA4'}</p>
            <p className="empty-title">Win-back reminders are off</p>
            <p className="empty-desc">Turn them on above to see who's due.</p>
          </div>
        </div>
      ) : due.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p className="empty-icon">{'\u2705'}</p>
            <p className="empty-title">No one's due right now</p>
            <p className="empty-desc">Customers will show up here once they cross your inactivity threshold.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {due.map(function(c) {
            var days = daysSince(c.last_activity);
            return (
              <div key={c._id} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 last:border-0">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {days !== null ? days + ' days since last activity \u00b7 ' : ''}{fmtDate(c.last_activity)}
                  </p>
                </div>
                <a
                  href={whatsappUrl(c)}
                  target="_blank" rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#25D366' }}
                >
                  WhatsApp
                </a>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

export default withAuth(WinBackPage, { requiredRole: 'owner' });
