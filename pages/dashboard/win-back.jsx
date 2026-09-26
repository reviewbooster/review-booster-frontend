/**
 * pages/dashboard/win-back.jsx
 * "Bring them back" -- an inactivity reminder with a business-type-aware
 * starting point. Owner sets a threshold + message body (or keeps the
 * suggested default); this page lists who's due. Sending is still manual --
 * a pre-filled WhatsApp link, same pattern as everywhere else in the app.
 */
import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';
import { waLinkProps } from '../../lib/waLink';

// "Hi {name}," is always the start of the message -- fixed so personalization
// can never get accidentally deleted, same pattern as the Review Request
// template. The owner only edits what comes after it.
var NAME_PREFIX = 'Hi {name}, ';

function stripNamePrefix(text) {
  var t = (text || '').replace(/^\s*hi\s*\{name\}\s*,?\s*/i, '');
  return t;
}

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
  const [summary,  setSummary]  = useState({ due_count: 0, returned_count: 0 });
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  useEffect(function() {
    setTimeout(function() {
      if (window.__rbStartDeepDive) window.__rbStartDeepDive('win-back');
    }, 50);
  }, []);

  const [enabled,       setEnabled]       = useState(false);
  const [inactiveDays,  setInactiveDays]  = useState(30);
  const [messageBody,   setMessageBody]   = useState('');
  const [offerEnabled,  setOfferEnabled]  = useState(false);
  const [offerText,     setOfferText]     = useState('');
  const [linkEnabled,   setLinkEnabled]   = useState(false);
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [dueRes, bizRes] = await Promise.all([
        api.get('/win-back/due'),
        api.get('/business/my-settings').catch(function() { return null; }),
      ]);
      setDue(dueRes.data.data || []);
      setSummary(dueRes.data.summary || { due_count: 0, returned_count: 0 });
      const s = dueRes.data.settings;
      setSettings(s);
      setEnabled(s.enabled);
      setInactiveDays(s.inactive_days);
      setMessageBody(stripNamePrefix(s.message_text));
      setOfferEnabled(!!s.offer_enabled);
      setOfferText(s.offer_text || '');
      setLinkEnabled(!!s.link_enabled);
      if (bizRes && bizRes.data && bizRes.data.data) {
        setGoogleReviewUrl(bizRes.data.data.google_review_url || '');
      }
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
        message_text: NAME_PREFIX + messageBody.trim(),
        offer_enabled: offerEnabled,
        offer_text: offerText,
        link_enabled: linkEnabled,
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
    if (!customer.phone) return null;
    var msg = (NAME_PREFIX + messageBody).replace(/\{name\}/g, customer.name);
    if (offerEnabled && offerText.trim()) {
      msg = msg + '\n\n\uD83C\uDF81 ' + offerText.trim();
    }
    if (linkEnabled && googleReviewUrl) {
      msg = msg + '\n\n' + googleReviewUrl;
    }
    var phone = customer.phone.replace(/^\+/, '');
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg);
  }

  // Best-effort: fires alongside the WhatsApp link opening so this customer
  // isn't suggested again every day. We can't know whether the message was
  // actually sent on WhatsApp's side -- same limitation as every other
  // "sent" action in this app.
  function handleWhatsAppClick(customerId) {
    api.post('/win-back/mark-sent/' + customerId).catch(function() {});
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Win-Back Reminders</h1>
        <p className="page-subtitle">Remind customers who haven't been back in a while.</p>
      </div>

      {error && <div className="alert-error mb-5"><span>!</span><span>{error}</span></div>}

      {!loading && enabled && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{summary.due_count}</p>
            <p className="text-xs text-gray-400 mt-1">Customers to contact</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{summary.returned_count}</p>
            <p className="text-xs text-gray-400 mt-1">Customers returned</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <div id="tour-winback-settings" className="flex items-center justify-between mb-4">
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
          <p className="text-xs text-gray-400 mt-1">We suggested a starting point based on your business type -- change it any time.</p>
        </div>

        <div className="mb-4">
          <label className="label">Message</label>
          <div className="flex items-start gap-0 rounded-xl border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-purple-200">
            <span className="text-sm text-gray-400 bg-gray-50 pl-3 pr-1 py-2.5 whitespace-nowrap select-none">{NAME_PREFIX}</span>
            <textarea
              className="flex-1 text-sm py-2.5 pr-3 outline-none resize-none"
              rows={3}
              maxLength={480}
              value={messageBody}
              onChange={function(e) { setMessageBody(e.target.value); }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">The greeting always includes the customer's name -- you just write what comes after it.</p>
        </div>

        <div className="mb-4 pt-1 border-t border-gray-100">
          <div className="flex items-center justify-between mt-3 mb-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">Include an offer</p>
              <p className="text-xs text-gray-400 mt-0.5">Added to the end of your message when it's on.</p>
            </div>
            <button
              type="button"
              onClick={function() { setOfferEnabled(function(v) { return !v; }); }}
              className={'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 shrink-0 ' + (offerEnabled ? 'bg-purple-600' : 'bg-gray-300')}
            >
              <span className={'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ' + (offerEnabled ? 'translate-x-6' : 'translate-x-1')} />
            </button>
          </div>
          {offerEnabled && (
            <div>
              <input
                className="input"
                maxLength={200}
                placeholder="e.g. 15% off your next visit"
                value={offerText}
                onChange={function(e) { setOfferText(e.target.value); }}
              />
              {offerText.trim() && (
                <p className="text-xs text-gray-400 mt-2">{'Added as: \uD83C\uDF81 ' + offerText.trim()}</p>
              )}
            </div>
          )}
        </div>

        <div className="mb-4 pt-1 border-t border-gray-100">
          <div className="flex items-center justify-between mt-3 mb-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">Include your Google review link</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {googleReviewUrl
                  ? "Added to the end of your message when it's on."
                  : 'Add a Google review link in Settings first to use this.'}
              </p>
            </div>
            <button
              type="button"
              disabled={!googleReviewUrl}
              onClick={function() { setLinkEnabled(function(v) { return !v; }); }}
              className={'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 shrink-0 disabled:opacity-40 ' + (linkEnabled ? 'bg-purple-600' : 'bg-gray-300')}
            >
              <span className={'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ' + (linkEnabled ? 'translate-x-6' : 'translate-x-1')} />
            </button>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center">
          {saving ? 'Saving...' : saved ? '\u2713 Saved' : 'Save Settings'}
        </button>
      </div>

      <div id="tour-winback-due" className="flex items-center justify-between mb-3">
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
                <a href={whatsappUrl(c)}
                  {...waLinkProps()}
                  onClick={function() { handleWhatsAppClick(c._id); }}
                  className={'shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-white transition-opacity ' + (c.phone ? 'hover:opacity-90' : 'opacity-40 pointer-events-none')}
                  style={{ backgroundColor: '#25D366' }}
                >
                  {c.phone ? 'WhatsApp' : 'No phone'}
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