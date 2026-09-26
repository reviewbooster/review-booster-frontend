/**
 * pages/dashboard/customers/[id].jsx
 * Customer Profile -- redesigned around the mockup: quick actions,
 * contact info, and a single chronological activity timeline instead of
 * two separate request/review lists. Follow-up scheduling isn't built yet
 * (see build notes) -- shown as "Coming soon" rather than pretending it works.
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../components/DashboardLayout';
import withAuth from '../../../components/withAuth';
import api from '../../../lib/api';
import { waLinkProps } from '../../../lib/waLink';
import { getNotesLabel } from '../../../lib/industryFieldLabels';

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

function fmtMonthYear(d) {
  if (!d) return '\u2014';
  try { return new Date(d).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }); }
  catch (_) { return '\u2014'; }
}

function fmtTimelineWhen(d) {
  if (!d) return '';
  var then = new Date(d);
  var now  = new Date();
  var sameDay = then.toDateString() === now.toDateString();
  if (sameDay) {
    return 'Today \u00b7 ' + then.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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

function buildLink(channel, customer, reviewUrl) {
  if (channel === 'whatsapp') {
    var phone = customer.phone.replace(/^\+/, '');
    return 'https://wa.me/' + phone;
  }
  if (channel === 'sms') {
    return 'sms:' + customer.phone;
  }
  if (channel === 'email') {
    return 'mailto:' + customer.email + '?subject=' + encodeURIComponent('We would love your feedback!');
  }
  return reviewUrl;
}

// -- Edit Customer Modal ------------------------------------------------------
function EditCustomerModal({ customer, businessType, onClose, onUpdated }) {
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
            <label className="label">{getNotesLabel(businessType).label}</label>
            <textarea className="input resize-none" rows={3}
              placeholder={getNotesLabel(businessType).placeholder}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}>
            </textarea>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-gray-700">Customer Status</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {form.opted_out
                  ? 'Inactive -- will not receive requests'
                  : 'Active -- can receive requests'}
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

// -- Delete Confirm Modal -----------------------------------------------------
function DeleteConfirmModal({ customer, onClose, onDeleted }) {
  var [loading, setLoading] = useState(false);
  var [error,   setError]   = useState('');

  var handleDelete = async function () {
    setLoading(true);
    setError('');
    try {
      await api.delete('/customers/' + customer._id);
      onDeleted();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete customer.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-slide-up">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-500 font-bold text-lg">{'!'}</div>
            <div>
              <h2 className="font-bold text-gray-900">Delete Customer</h2>
              <p className="text-xs text-gray-400 mt-0.5">This can't be undone</p>
            </div>
          </div>
          {error && <div className="alert-error mb-4"><span>{'\u26A0'}</span><span>{error}</span></div>}
          <p className="text-sm text-gray-600 mb-5">
            {'Are you sure you want to delete '}
            <span className="font-semibold text-gray-900">{customer.name}</span>
            {'?'}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleDelete} disabled={loading}
              className="flex-1 justify-center flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors duration-150 disabled:opacity-60">
              {loading ? '\u2026 Deleting' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Send Request Modal -------------------------------------------------------
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
                {...waLinkProps()}
                className="btn-primary w-full flex items-center justify-center">
                {'Open ' + CHANNEL_META[result.channel].label}
              </a>
              <div>
                <p className="label mb-1">Or copy the link</p>
                <div className="flex gap-2">
                  <input readOnly value={result.reviewUrl}
                    className="input text-base sm:text-xs flex-1 font-mono"
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

// -- Schedule Follow-up Modal -------------------------------------------------
function ScheduleFollowUpModal({ customer, followUp, onClose, onSaved }) {
  var todayStr = new Date().toISOString().slice(0, 10);
  var [dueDate, setDueDate] = useState(followUp ? new Date(followUp.due_date).toISOString().slice(0, 10) : todayStr);
  var [note,    setNote]    = useState(followUp ? (followUp.note || '') : '');
  var [error,   setError]   = useState('');
  var [saving,  setSaving]  = useState(false);
  var [removing, setRemoving] = useState(false);

  var handleSave = async function (e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      var res = await api.put('/customers/' + customer._id + '/follow-up', { due_date: dueDate, note: note });
      onSaved(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to schedule follow-up.');
    } finally {
      setSaving(false);
    }
  };

  var handleCancelFollowUp = async function () {
    setRemoving(true);
    try {
      await api.delete('/customers/' + customer._id + '/follow-up');
      onSaved(null);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel follow-up.');
      setRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{followUp ? 'Reschedule follow-up' : 'Schedule a follow-up'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">{'\u2715'}</button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && <div className="alert-error"><span>{'\u26A0'}</span><span>{error}</span></div>}
          <div>
            <label className="label">Due date</label>
            <input className="input" type="date" required
              value={dueDate}
              onChange={e => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Note (optional)</label>
            <textarea className="input resize-none" rows={3}
              placeholder="What's this follow-up for?"
              value={note}
              onChange={e => setNote(e.target.value)}>
            </textarea>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? '\u2026 Saving' : followUp ? 'Reschedule' : 'Schedule'}
            </button>
          </div>
          {followUp && (
            <button type="button" onClick={handleCancelFollowUp} disabled={removing}
              className="w-full text-center text-xs text-red-500 hover:text-red-600 font-medium pt-1">
              {removing ? '\u2026 Removing' : 'Remove this follow-up'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

// -- Customer Detail Page -----------------------------------------------------
function CustomerDetailPage() {
  var router = useRouter();
  var { id } = router.query;

  useEffect(function() {
    try {
      if (localStorage.getItem('rb_deep_dive_seen_customer-detail') !== '1') {
        setTimeout(function() {
          if (window.__rbStartDeepDive) window.__rbStartDeepDive('customer-detail');
        }, 50);
      }
    } catch (e) {}
  }, []);

  var [customer, setCustomer]   = useState(null);
  var [businessType, setBusinessType] = useState(null);
  var [requests, setRequests]   = useState([]);
  var [reviews,  setReviews]    = useState([]);
  var [loading,  setLoading]    = useState(true);
  var [error,    setError]      = useState('');
  var [editOpen, setEditOpen]   = useState(false);
  var [sendOpen, setSendOpen]   = useState(false);
  var [deleteOpen, setDeleteOpen] = useState(false);
  var [followUpOpen, setFollowUpOpen] = useState(false);
  var [followUp,     setFollowUp]     = useState(null);
  var [timelineExpanded, setTimelineExpanded] = useState(false);

  var [followUpLoaded, setFollowUpLoaded] = useState(false);
  var [menuOpen, setMenuOpen]   = useState(false);
  var [toast,    setToast]      = useState('');

  var showToast = function (msg) {
    setToast(msg);
    setTimeout(function () { setToast(''); }, 3000);
  };

  var handleCompleteFollowUp = async function () {
    try {
      await api.post('/customers/' + customer._id + '/follow-up/complete');
      setFollowUp(null);
      showToast('Follow-up marked done!');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to complete follow-up.');
    }
  };

  var fetchAll = async function (opts) {
    var silent = opts && opts.silent;
    if (!id) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      var [cRes, rqRes, rvRes, fuRes] = await Promise.all([
        api.get('/customers/' + id),
        api.get('/customers/' + id + '/requests'),
        api.get('/customers/' + id + '/reviews'),
        api.get('/customers/' + id + '/follow-up').catch(function () { return { data: { data: null } }; }),
      ]);
      setCustomer(cRes.data.data);
      setRequests(rqRes.data.data || []);
      setReviews(rvRes.data.data || []);
      setFollowUp(fuRes.data.data || null);
      setFollowUpLoaded(true);
    } catch (_) {
      if (!silent) setError('Failed to load customer details.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(function () { fetchAll(); }, [id]);

  useEffect(function () {
    api.get('/business/my-settings').then(function (res) {
      var biz = res.data && res.data.data;
      if (biz && biz.type) setBusinessType(biz.type);
    }).catch(function () {});
  }, []);

  var avgRating = reviews.length > 0
    ? (reviews.reduce(function (s, r) { return s + r.rating; }, 0) / reviews.length).toFixed(1)
    : null;

  // -- Loading skeleton ---------------------------------------------------
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-20 h-4 bg-gray-200 rounded-full animate-pulse" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse mb-4 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-gray-200 mb-3" />
          <div className="h-4 w-36 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-28 bg-gray-100 rounded" />
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1, 2, 3].map(function (i) {
            return <div key={i} className="bg-white rounded-2xl border border-gray-100 h-16 animate-pulse" />;
          })}
        </div>
      </DashboardLayout>
    );
  }

  // -- Error state ----------------------------------------------------------
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

  var tags = customer.tags || [];
  var source = tags.indexOf('qr_scan') !== -1 ? 'QR scan' : 'Added manually';

  // Merge request history + review history into one chronological timeline.
  var timeline = [];
  timeline.push({
    kind: 'added',
    date: customer.added_at,
    title: 'Customer added',
    detail: source,
  });
  requests.forEach(function (req) {
    timeline.push({
      kind: 'request',
      date: req.sent_at,
      title: 'Review request sent',
      detail: req.channel === 'whatsapp' ? 'WhatsApp' : req.channel === 'sms' ? 'SMS' : req.channel === 'email' ? 'Email' : req.channel,
    });
  });
  reviews.forEach(function (rv) {
    timeline.push({
      kind: 'review',
      date: rv.created_at || rv.createdAt,
      title: rv.is_public ? 'Review submitted' : 'Private feedback received',
      detail: rv.rating + ' star' + (rv.rating === 1 ? '' : 's'),
    });
  });
  timeline.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

  var TIMELINE_DOT = {
    added:   'bg-green-500',
    request: 'bg-purple-500',
    review:  'bg-green-500',
  };

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
          businessType={businessType}
          onClose={() => setEditOpen(false)}
          onUpdated={updated => { setCustomer(updated); showToast('Customer updated!'); }} />
      )}
      {sendOpen && (
        <SendRequestModal
          customer={customer}
          onClose={() => setSendOpen(false)}
          onSent={() => { fetchAll({ silent: true }); showToast('Review link ready!'); }} />
      )}
      {deleteOpen && (
        <DeleteConfirmModal
          customer={customer}
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => router.push('/dashboard/customers')} />
      )}
      {followUpOpen && (
        <ScheduleFollowUpModal
          customer={customer}
          followUp={followUp}
          onClose={() => setFollowUpOpen(false)}
          onSaved={updated => { setFollowUp(updated); showToast(updated ? 'Follow-up scheduled!' : 'Follow-up removed.'); }} />
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
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors text-xl leading-none pb-0.5">
            {'\u22EE'}
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-32 overflow-hidden">
                <button
                  onClick={() => { setEditOpen(true); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  Edit
                </button>
                <button
                  onClick={() => { setDeleteOpen(true); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Profile card -- centered avatar, name, status, quick actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4 flex flex-col items-center text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl shrink-0 mb-3"
          style={{ backgroundColor: avatarBg(customer.name) }}>
          {customer.name.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-lg font-bold text-gray-900">{customer.name}</h1>
        <p className="text-xs text-gray-400 mt-0.5">{'Customer since ' + fmtMonthYear(customer.added_at)}</p>
        <span className={'mt-2 text-[10px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ' +
          (customer.opted_out ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-green-600')}>
          <span className={'w-1.5 h-1.5 rounded-full ' + (customer.opted_out ? 'bg-gray-400' : 'bg-green-500')} />
          {customer.opted_out ? 'Inactive' : 'Active'}
        </span>

        {/* Quick actions */}
        <div id="tour-customer-actions" className="grid grid-cols-3 gap-2 w-full mt-5">
          <button
            onClick={() => setSendOpen(true)}
            disabled={customer.opted_out}
            className="flex flex-col items-center gap-1 py-3 rounded-xl border border-gray-200 text-gray-700 hover:border-purple-300 hover:text-purple-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="text-xs font-semibold">Message</span>
          </button>
          <a href={customer.phone ? 'tel:' + customer.phone : undefined}
            onClick={e => { if (!customer.phone) e.preventDefault(); }}
            className={'flex flex-col items-center gap-1 py-3 rounded-xl border transition-colors ' +
              (customer.phone ? 'border-gray-200 text-gray-700 hover:border-purple-300 hover:text-purple-600' : 'border-gray-100 text-gray-300 cursor-not-allowed')}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-xs font-semibold">Call</span>
          </a>
          <button
            onClick={() => setFollowUpOpen(true)}
            className="flex flex-col items-center gap-1 py-3 rounded-xl border border-gray-200 text-gray-700 hover:border-purple-300 hover:text-purple-600 transition-colors">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m11-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-semibold">Follow-up</span>
          </button>
        </div>
      </div>

      {/* Contact information */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-3">Contact information</p>
        <div className="space-y-2.5">
          {customer.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {customer.phone}
            </div>
          )}
          {customer.email && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {customer.email}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {'Source: ' + source}
          </div>
        </div>
        {customer.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-1.5">{getNotesLabel(businessType).label}</p>
            <p className="text-sm text-gray-600">{customer.notes}</p>
          </div>
        )}
      </div>

      {/* Next follow-up */}
      <div id="tour-customer-followup" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-bold text-gray-900">Next follow-up</p>
          {followUpLoaded && (
            <span className={'text-[10px] font-semibold px-2 py-0.5 rounded-full ' +
              (!followUp
                ? 'bg-gray-100 text-gray-400'
                : new Date(followUp.due_date) < new Date(new Date().toDateString())
                  ? 'bg-red-50 text-red-500'
                  : new Date(followUp.due_date).toDateString() === new Date().toDateString()
                    ? 'bg-orange-50 text-orange-500'
                    : 'bg-blue-50 text-blue-500')}>
              {!followUp
                ? 'Not scheduled'
                : new Date(followUp.due_date) < new Date(new Date().toDateString())
                  ? 'Overdue'
                  : new Date(followUp.due_date).toDateString() === new Date().toDateString()
                    ? 'Due today'
                    : fmtDate(followUp.due_date)}
            </span>
          )}
        </div>
        {!followUp ? (
          <button
            onClick={() => setFollowUpOpen(true)}
            className="w-full text-left mt-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
            <p className="text-sm font-semibold text-gray-700">Schedule a follow-up</p>
            <p className="text-xs text-gray-400 mt-0.5">Set a reminder to reconnect with this customer.</p>
          </button>
        ) : (
          <div className="mt-2">
            {followUp.note && <p className="text-sm text-gray-600 mb-3">{followUp.note}</p>}
            <div className="flex gap-2">
              <button onClick={handleCompleteFollowUp}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                Mark done
              </button>
              <button onClick={() => setFollowUpOpen(true)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                Reschedule
              </button>
            </div>
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

      {/* Activity timeline -- merged request history + review history */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Activity timeline</h2>
        </div>
        <div className="px-5 py-4">
          {(timelineExpanded ? timeline : timeline.slice(0, 5)).map(function (item, i) {
            var visibleCount = timelineExpanded ? timeline.length : Math.min(5, timeline.length);
            return (
              <div key={i} className="flex gap-3 pb-4 last:pb-0 relative">
                {i < visibleCount - 1 && (
                  <span className="absolute left-[5px] top-4 bottom-0 w-px bg-gray-100" />
                )}
                <span className={'w-3 h-3 rounded-full shrink-0 mt-1 z-10 ' + TIMELINE_DOT[item.kind]} />
                <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.detail}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">{fmtTimelineWhen(item.date)}</span>
                </div>
              </div>
            );
          })}
          {timeline.length > 5 && (
            <button
              type="button"
              onClick={function () { setTimelineExpanded(!timelineExpanded); }}
              className="w-full text-center text-xs font-semibold text-purple-600 hover:text-purple-700 pt-1"
            >
              {timelineExpanded ? 'Show less' : 'See more (' + (timeline.length - 5) + ')'}
            </button>
          )}
        </div>
      </div>

    </DashboardLayout>
  );
}

export default withAuth(CustomerDetailPage);