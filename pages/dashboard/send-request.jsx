/**
 * pages/dashboard/send-request.jsx
 * Fast-path customer search + Send Review Request -- reachable from the
 * raised center button on mobile, and from anywhere else in the app.
 * Reuses the same search, add-customer, and send-request logic as the
 * Customers page so this is a shortcut into that flow, not a new one.
 */

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import StaffPicker from '../../components/StaffPicker';
import { getDefaultTemplates } from '../../lib/defaultMessageTemplates';
import { waLinkProps } from '../../lib/waLink';

var DEFAULT_REVIEW_TEMPLATE = 'Hi {{name}}, please take a moment to share your feedback. It only takes 30 seconds!\n\n{{link}}';

const AVATAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#0EA5E9'];
function avatarBg(idx) { return AVATAR_COLORS[idx % AVATAR_COLORS.length]; }

// -- Add Customer Modal (same as Customers page) -------------------------------
var COUNTRY_CODES = [
  { code: '+91',  flag: '\uD83C\uDDEE\uD83C\uDDF3' },
  { code: '+1',   flag: '\uD83C\uDDFA\uD83C\uDDF8' },
  { code: '+44',  flag: '\uD83C\uDDEC\uD83C\uDDE7' },
  { code: '+971', flag: '\uD83C\uDDE6\uD83C\uDDEA' },
  { code: '+65',  flag: '\uD83C\uDDF8\uD83C\uDDEC' },
  { code: '+61',  flag: '\uD83C\uDDE6\uD83C\uDDFA' },
  { code: '+966', flag: '\uD83C\uDDF8\uD83C\uDDE6' },
  { code: '+974', flag: '\uD83C\uDDF6\uD83C\uDDE6' },
];

function AddCustomerModal({ onClose, onCreated }) {
  const [form,    setForm]    = useState({ name: '', phoneCode: '+91', phoneNumber: '', email: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { name: form.name, phone: form.phoneNumber ? (form.phoneCode + form.phoneNumber) : '', email: form.email };
      const { data } = await api.post('/customers', payload);
      onCreated(data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add customer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Add Customer</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">{'\u2715'}</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="alert-error"><span>{'\u26A0'}</span><span>{error}</span></div>}
          <div>
            <label className="label">Full Name *</label>
            <input className="input" required placeholder="e.g. Priya Sharma"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Phone</label>
            <div className="flex gap-2">
              <select
                className="input w-28 shrink-0"
                value={form.phoneCode}
                onChange={e => setForm(f => ({ ...f, phoneCode: e.target.value }))}
              >
                {COUNTRY_CODES.map(function(c) {
                  return <option key={c.code} value={c.code}>{c.code + '  ' + c.flag}</option>;
                })}
              </select>
              <input className="input flex-1" placeholder="98765 43210"
                value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value.replace(/[^0-9]/g, '') }))} />
            </div>
            <p className="text-xs text-gray-400 mt-1">Select the country code, then enter the number without it.</p>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="customer@gmail.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <><span className="spinner" />{' Adding\u2026'}</> : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -- Pre-filled link builder (same as Customers page) --------------------------
function fillTemplate(template, vars) {
  var result = template;
  Object.keys(vars).forEach(function(k) {
    result = result.split('{{' + k + '}}').join(vars[k] == null ? '' : vars[k]);
  });
  return result;
}

function buildPrefilledLink(channel, customer, reviewUrl, template) {
  var msg = fillTemplate(template || DEFAULT_REVIEW_TEMPLATE, { name: customer.name, link: reviewUrl });
  if (channel === 'whatsapp') {
    var phone = customer.phone.replace(/^\+/, '');
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg);
  }
  if (channel === 'sms') {
    return 'sms:' + customer.phone + '?body=' + encodeURIComponent(msg);
  }
  if (channel === 'email') {
    return 'mailto:' + customer.email +
      '?subject=' + encodeURIComponent('We would love your feedback!') +
      '&body='    + encodeURIComponent(msg);
  }
  return reviewUrl;
}

// -- Send Request Modal (same as Customers page) --------------------------------
function SendRequestModal({ customer, onClose, onSent }) {
  const [loadingCh, setLoadingCh] = useState(null);
  const [error,     setError]     = useState('');
  const [result,    setResult]    = useState(null);
  const [copied,    setCopied]    = useState(false);
  const [servedBy,  setServedBy]  = useState(null);
  const [template,  setTemplate]  = useState(DEFAULT_REVIEW_TEMPLATE);

  useEffect(function() {
    api.get('/business/my-settings').then(function(res) {
      var biz = res.data && res.data.data;
      var mt = biz && biz.message_templates;
      if (mt && mt.review_request) {
        setTemplate(mt.review_request);
      } else if (biz && biz.type) {
        setTemplate(getDefaultTemplates(biz.type).review_request);
      }
    }).catch(function() {});
  }, []);

  const CHANNEL_META = {
    whatsapp: { label: 'WhatsApp', color: 'bg-green-500 hover:bg-green-600',   needs: 'phone' },
    sms:      { label: 'SMS',      color: 'bg-blue-500 hover:bg-blue-600',     needs: 'phone' },
    email:    { label: 'Email',    color: 'bg-purple-500 hover:bg-purple-600', needs: 'email' },
  };

  const handleSend = async (channel) => {
    setError('');
    setLoadingCh(channel);
    try {
      const { data } = await api.post('/requests', { customer_id: customer._id, channel, served_by: servedBy });
      setResult({ channel, reviewUrl: data.review_url });
      onSent();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate link.');
    } finally {
      setLoadingCh(null);
    }
  };

  const copyLink = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.reviewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  const remaining = ['whatsapp', 'sms', 'email'].filter(ch => ch !== result?.channel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">
              {result ? (CHANNEL_META[result.channel].label + ' Ready!') : 'Send Review Request'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{customer.name}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">{'\u2715'}</button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="alert-error"><span>{'!'}</span><span>{error}</span></div>}
          {!result ? (
            <>
              <p className="text-sm text-gray-500">Tap a channel to generate the review link for this customer.</p>
              <StaffPicker value={servedBy} onChange={setServedBy} label="Who served this customer? (optional)" />
              <div className="space-y-3">
                {['whatsapp', 'sms', 'email'].map(ch => {
                  const meta   = CHANNEL_META[ch];
                  const noData = meta.needs === 'phone' ? !customer.phone : !customer.email;
                  return (
                    <button key={ch} onClick={() => handleSend(ch)} disabled={!!loadingCh || noData}
                      className={'w-full flex items-center justify-between px-4 py-3 rounded-xl text-white text-sm font-semibold transition-colors duration-150 ' + meta.color + ' disabled:opacity-40 disabled:cursor-not-allowed'}>
                      <span>{meta.label}</span>
                      {loadingCh === ch
                        ? <span className="spinner border-white/30 border-t-white" />
                        : noData
                          ? <span className="text-xs font-normal opacity-70">{'No ' + meta.needs}</span>
                          : <span className="opacity-60">{'\u2192'}</span>}
                    </button>
                  );
                })}
              </div>
              <button onClick={onClose} className="btn-secondary w-full justify-center">Cancel</button>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0 font-bold text-sm">{'\u2713'}</div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Link ready!</p>
                  <p className="text-xs text-green-600 mt-0.5">Tap the button below to send the pre-filled message.</p>
                </div>
              </div>
              <a href={buildPrefilledLink(result.channel, customer, result.reviewUrl, template)}
                {...waLinkProps()}
                className="btn-primary w-full flex items-center justify-center">
                {'Open ' + CHANNEL_META[result.channel].label}
              </a>
              <div>
                <p className="label mb-1">Or copy the link</p>
                <div className="flex gap-2">
                  <input readOnly value={result.reviewUrl} className="input text-base sm:text-xs flex-1 font-mono"
                    onFocus={e => e.target.select()} />
                  <button onClick={copyLink}
                    className={'py-2 px-3 rounded-xl text-sm font-semibold border transition-colors duration-150 ' +
                      (copied ? 'border-green-300 text-green-600 bg-green-50' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
                    {copied ? '\u2713' : 'Copy'}
                  </button>
                </div>
              </div>
              {remaining.length > 0 && (
                <div>
                  <p className="label mb-1">Also send via</p>
                  <div className="flex gap-2">
                    {remaining.map(ch => {
                      const meta   = CHANNEL_META[ch];
                      const noData = meta.needs === 'phone' ? !customer.phone : !customer.email;
                      return noData ? (
                        <span key={ch} className="flex-1 py-2 px-3 rounded-xl text-sm font-semibold border border-gray-100 text-gray-300 text-center">{meta.label}</span>
                      ) : (
                        <a key={ch} href={buildPrefilledLink(ch, customer, result.reviewUrl, template)}
                          {...waLinkProps()}
                          className="flex-1 py-2 px-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors duration-150 text-center">
                          {meta.label}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
              <button onClick={onClose} className="btn-secondary w-full justify-center">Done</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// -- Send Request Page (search -> pick or add -> send) --------------------------
function SendRequestPage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';

  const [search,     setSearch]     = useState('');
  const [results,    setResults]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [showAdd,    setShowAdd]    = useState(false);
  const [sendTarget, setSendTarget] = useState(null);
  const [toast,      setToast]      = useState('');

  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ search: q, limit: 8 });
      const { data } = await api.get('/customers?' + params.toString());
      setResults(data.data ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(search), 300);
    return () => clearTimeout(t);
  }, [search, doSearch]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <DashboardLayout>
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 alert-success shadow-lg animate-slide-up">
          <span>{'\u2713'}</span><span>{toast}</span>
        </div>
      )}

      {showAdd && (
        <AddCustomerModal
          onClose={() => setShowAdd(false)}
          onCreated={(c) => { setSendTarget(c); }}
        />
      )}

      {sendTarget && (
        <SendRequestModal
          customer={sendTarget}
          onClose={() => setSendTarget(null)}
          onSent={() => showToast('Review link ready for ' + sendTarget.name + '!')}
        />
      )}

      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900 leading-tight">Send Review Request</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Find a customer, then send the review link right away.</p>
      </div>

      <div className="relative mb-4">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
        </span>
        <input
          autoFocus
          className="w-full bg-gray-100 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-200 transition"
          placeholder="Search by name, phone or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {search.trim().length < 2 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <p className="text-3xl mb-2">{'\uD83D\uDD0D'}</p>
          <p className="text-sm text-gray-500">Start typing a name, phone, or email to find a customer.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4">
          {loading ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-400">Searching...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center px-6">
              <p className="text-sm text-gray-500">{'No customers match "' + search + '"'}</p>
            </div>
          ) : (
            results.map((c, i) => (
              <button
                key={c._id}
                onClick={() => setSendTarget(c)}
                disabled={c.opted_out}
                className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors duration-100 text-left disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: avatarBg(i) }}
                >
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                  {c.phone && <p className="text-[11px] text-gray-400 mt-0.5">{c.phone}</p>}
                  {c.email && <p className="text-[11px] text-gray-400">{c.email}</p>}
                </div>
                {c.opted_out ? (
                  <span title="Opted out -- will not receive review requests" className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 shrink-0">Inactive</span>
                ) : (
                  <span className="text-purple-400 shrink-0">{'\u2192'}</span>
                )}
              </button>
            ))
          )}
          {!isStaff && (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50/60 transition-colors duration-100 text-purple-600 font-semibold text-sm"
            >
              <span className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">{'+'}</span>
              {'Add "' + search + '" as a new customer'}
            </button>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

export default withAuth(SendRequestPage);