/**
 * pages/dashboard/customers/[id].jsx
 * Customer Detail — profile, request history, submitted reviews.
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../components/DashboardLayout';
import withAuth from '../../../components/withAuth';
import api from '../../../lib/api';

const AVATAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#0EA5E9'];

function avatarBg(name) {
  if (!name) return AVATAR_COLORS[0];
  var code = 0;
  for (var i = 0; i < name.length; i++) { code += name.charCodeAt(i); }
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function fmtDate(d) {
  if (!d) return '\u2014';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch (_) { return '\u2014'; }
}

function fmtDateTime(d) {
  if (!d) return '\u2014';
  try {
    return new Date(d).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch (_) { return '\u2014'; }
}

function Stars({ rating }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(function (s) {
        return (
          <svg key={s} width="13" height="13" viewBox="0 0 24 24"
            fill={s <= rating ? '#7C3AED' : '#E5E7EB'}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        );
      })}
    </span>
  );
}

function ChannelBadge({ channel }) {
  var map = {
    whatsapp: ['WhatsApp', 'bg-green-50 text-green-600'],
    sms:      ['SMS',      'bg-blue-50 text-blue-600'],
    email:    ['Email',    'bg-purple-50 text-purple-600'],
    qr:       ['QR',       'bg-orange-50 text-orange-500'],
  };
  var entry = map[channel] || [channel || 'Unknown', 'bg-gray-100 text-gray-500'];
  return (
    <span className={'text-[10px] font-semibold px-2 py-0.5 rounded-full ' + entry[1]}>{entry[0]}</span>
  );
}

function ReqStatusBadge({ status }) {
  var map = {
    sent:      ['Sent',      'bg-blue-50 text-blue-500'],
    opened:    ['Opened',    'bg-amber-50 text-amber-600'],
    completed: ['Completed', 'bg-green-50 text-green-600'],
  };
  var entry = map[status] || [status || '', 'bg-gray-100 text-gray-500'];
  return (
    <span className={'text-[10px] font-semibold px-2 py-0.5 rounded-full ' + entry[1]}>{entry[0]}</span>
  );
}

function buildLink(channel, customer, reviewUrl) {
  var msg = 'Hi ' + customer.name + ', please take a moment to share your feedback. It only takes 30 seconds! ' + reviewUrl;
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
      '&body=' + encodeURIComponent(msg);
  }
  return reviewUrl;
}

// ── Edit Customer Modal ───────────────────────────────────────────────────────
function EditCustomerModal({ customer, onClose, onUpdated }) {
  var [form, setForm] = useState({
    name:      customer.name      || '',
    phone:     customer.phone     || '',
    email:     customer.email     || '',
    notes:     customer.notes     || '',
    opted_out: customer.opted_out || false,
  });
  var [error,   setError]   = useState('');
  var [loading, setLoading] = useState(false);

  var handleSubmit = async function (e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      var payload = {
        name:      form.name,
        phone:     form.phone || null,
        email:     form.email || null,
        notes:     form.notes || null,
        opted_out: form.opted_out,
      };
      var res = await api.put('/customers/' + customer._id, payload);
      onUpdated(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update customer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-up overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Edit Customer</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">{'\u2715'}</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="alert-error"><span>{'\u26A0'}</span><span>{error}</span></div>}
          <div>
            <label className="label">Full Name *</label>
            <input className="input" required placeholder="e.g. Priya Sharma"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" placeholder="+919876543210"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="customer@gmail.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={3}
              placeholder="Any notes about this customer..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}>
            </textarea>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-gray-700">Customer Status</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {form.opted_out
                  ? 'Inactive \u2014 will not receive requests'
                  : 'Active \u2014 can receive requests'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, opted_out: !f.opted_out }))}
              className={'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ' +
                (form.opted_out ? 'bg-gray-300' : 'bg-purple-600')}>
              <span className={'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ' +
                (form.opted_out ? 'translate-x-1' : 'translate-x-6')} />
            </button>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? '\u2026 Saving' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Send Request Modal ────────────────────────────────────────────────────────
function SendRequestModal({ customer, onClose, onSent }) {
  var [loadingCh, setLoadingCh] = useState(null);
  var [error,     setError]     = useState('');
  var [result,    setResult]    = useState(null);
  var [copied,    setCopied]    = useState(false);

  var CHANNEL_META = {
    whatsapp: { label: 'WhatsApp', color: 'bg-green-500 hover:bg-green-600',   needs: 'phone' },
    sms:      { label: 'SMS',      color: 'bg-blue-500 hover:bg-blue-600',     needs: 'phone' },
    email:    { label: 'Email',    color: 'bg-purple-500 hover:bg-purple-600', needs: 'email' },
  };

  var handleSend = async function (channel) {
    setError('');
    setLoadingCh(channel);
    try {
      var res = await api.post('/requests', { customer_id: customer._id, channel: channel });
      setResult({ channel: channel, reviewUrl: res.data.review_url });
      onSent();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate link.');
    } finally {
      setLoadingCh(null);
    }
  };

  var copyLink = async function () {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.reviewUrl);
      setCopied(true);
      setTimeout(function () { setCopied(false); }, 2000);
    } catch (_) {}
  };

  var remaining = ['whatsapp', 'sms', 'email'].filter(function (ch) { return ch !== result?.channel; });

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
              <p className="text-sm text-gray-500">Tap a channel to generate the review link.</p>
              <div className="space-y-3">
                {['whatsapp', 'sms', 'email'].map(function (ch) {
                  var meta   = CHANNEL_META[ch];
                  var noData = meta.needs === 'phone' ? !customer.phone : !customer.email;
                  return (
                    <button key={ch} onClick={() => handleSend(ch)}
                      disabled={!!loadingCh || noData}
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
              <a href={buildLink(result.channel, customer, result.reviewUrl)}
                target="_blank" rel="noopener noreferrer"
                className="btn-primary w-full flex items-center justify-center">
                {'Open ' + CHANNEL_META[result.channel].label}
              </a>
              <div>
                <p className="label mb-1">Or copy the link</p>
                <div className="flex gap-2">
                  <input readOnly value={result.reviewUrl}
                    className="input text-xs flex-1 font-mono"
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
                    {remaining.map(function (ch) {
                      var meta   = CHANNEL_META[ch];
                      var noData = meta.needs === 'phone' ? !customer.phone : !customer.email;
                      return noData ? (
                        <span key={ch} className="flex-1 py-2 px-3 rounded-xl text-sm font-semibold border border-gray-100 text-gray-300 text-center">{meta.label}</span>
                      ) : (
                        <a key={ch}
                          href={buildLink(ch, customer, result.reviewUrl)}
                          target="_blank" rel="noopener noreferrer"
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

// ── Customer Detail Page ──────────────────────────────────────────────────────
function CustomerDetailPage() {
  var router = useRouter();
  var { id } = router.query;

  var [customer, setCustomer] = useState(null);
  var [requests, setRequests] = useState([]);
  var [reviews,  setReviews]  = useState([]);
  var [loading,  setLoading]  = useState(true);
  var [error,    setError]    = useState('');
  var [editOpen, setEditOpen] = useState(false);
  var [sendOpen, setSendOpen] = useState(false);
  var [toast,    setToast]    = useState('');

  var showToast = function (msg) {
    setToast(msg);
    setTimeout(function () { setToast(''); }, 3000);
  };

  var fetchAll = async function () {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      var [cRes, rqRes, rvRes] = await Promise.all([
        api.get('/customers/' + id),
        api.get('/customers/' + id + '/requests'),
        api.get('/customers/' + id + '/reviews'),
      ]);
      setCustomer(cRes.data.data);
      setRequests(rqRes.data.data || []);
      setReviews(rvRes.data.data || []);
    } catch (_) {
      setError('Failed to load customer details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(function () { fetchAll(); }, [id]);

  var avgRating = reviews.length > 0
    ? (reviews.reduce(function (s, r) { return s + r.rating; }, 0) / reviews.length).toFixed(1)
    : null;

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-20 h-4 bg-gray-200 rounded-full animate-pulse" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-36 bg-gray-200 rounded" />
              <div className="h-3 w-28 bg-gray-100 rounded" />
              <div className="h-3 w-20 bg-gray-100 rounded" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1, 2, 3].map(function (i) {
            return <div key={i} className="bg-white rounded-2xl border border-gray-100 h-20 animate-pulse" />;
          })}
        </div>
      </DashboardLayout>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error || !customer) {
    return (
      <DashboardLayout>
        <div className="alert-error mb-4">
          <span>{'\u26A0'}</span><span>{error || 'Customer not found.'}</span>
        </div>
        <button
          onClick={() => router.push('/dashboard/customers')}
          className="btn-secondary">
          {'\u2190 Back to Customers'}
        </button>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 alert-success shadow-lg animate-slide-up">
          <span>{'\u2713'}</span><span>{toast}</span>
        </div>
      )}

      {/* Modals */}
      {editOpen && (
        <EditCustomerModal
          customer={customer}
          onClose={() => setEditOpen(false)}
          onUpdated={updated => { setCustomer(updated); showToast('Customer updated!'); }} />
      )}
      {sendOpen && (
        <SendRequestModal
          customer={customer}
          onClose={() => setSendOpen(false)}
          onSent={() => { fetchAll(); showToast('Review link ready!'); }} />
      )}

      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => router.push('/dashboard/customers')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Customers
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 transition-colors">
            Edit
          </button>
          {!customer.opted_out && (
            <button
              onClick={() => setSendOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#7C3AED' }}>
              Send Request
            </button>
          )}
        </div>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0"
            style={{ backgroundColor: avatarBg(customer.name) }}>
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900">{customer.name}</h1>
              <span className={'text-[10px] font-semibold px-2 py-0.5 rounded-full ' +
                (customer.opted_out ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-green-600')}>
                {customer.opted_out ? 'Inactive' : 'Active'}
              </span>
            </div>
            <div className="mt-2 space-y-1.5">
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {customer.phone}
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {customer.email}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {'Added ' + fmtDate(customer.added_at)}
                {customer.last_contacted && (
                  <span>{'\u00A0\u00B7 Last contacted ' + fmtDate(customer.last_contacted)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        {customer.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-1.5">Notes</p>
            <p className="text-sm text-gray-600">{customer.notes}</p>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Requests Sent</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{reviews.length}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Reviews</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{avgRating || '\u2014'}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Avg Rating</p>
        </div>
      </div>

      {/* Review Requests */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Review Requests</h2>
          <span className="text-xs text-gray-400">
            {requests.length + (requests.length === 1 ? ' request' : ' requests')}
          </span>
        </div>
        {requests.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-3xl mb-2">{'\uD83D\uDCEC'}</p>
            <p className="text-sm text-gray-500 font-medium">No requests sent yet</p>
            <p className="text-xs text-gray-400 mt-1">Use the Send Request button to get started.</p>
          </div>
        ) : (
          requests.map(function (req) {
            return (
              <div key={req._id}
                className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 last:border-0">
                <ChannelBadge channel={req.channel} />
                <ReqStatusBadge status={req.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">{fmtDateTime(req.sent_at)}</p>
                </div>
                {req.opened_at && (
                  <span className="text-[10px] text-green-600 font-semibold">Opened</span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reviews Submitted */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Reviews Submitted</h2>
          <span className="text-xs text-gray-400">
            {reviews.length + (reviews.length === 1 ? ' review' : ' reviews')}
          </span>
        </div>
        {reviews.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-3xl mb-2">{'\u2B50'}</p>
            <p className="text-sm text-gray-500 font-medium">No reviews yet</p>
            <p className="text-xs text-gray-400 mt-1">Reviews will appear here once submitted.</p>
          </div>
        ) : (
          reviews.map(function (rv) {
            return (
              <div key={rv._id}
                className="px-5 py-4 border-b border-gray-100 last:border-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Stars rating={rv.rating} />
                    <span className={'text-[10px] font-semibold px-2 py-0.5 rounded-full ' +
                      (rv.is_public ? 'bg-blue-50 text-blue-500' : 'bg-red-50 text-red-400')}>
                      {rv.is_public ? 'Public' : 'Private'}
                    </span>
                    {rv.source && <ChannelBadge channel={rv.source} />}
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {fmtDate(rv.created_at || rv.createdAt)}
                  </span>
                </div>
                {rv.feedback_text && (
                  <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2.5">
                    {rv.feedback_text}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

    </DashboardLayout>
  );
}

export default withAuth(CustomerDetailPage);