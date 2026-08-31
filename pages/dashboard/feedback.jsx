/**
 * pages/dashboard/feedback.jsx
 * Private Feedback page — Phase 2 redesign.
 * Session 17 — urgency badges.
 * Session 19 — overflow fix, inline Resolve icon, removed three-dot.
 * Session 19b — modal: customer details, reply textarea, copy-to-clipboard.
 * Session 19c — more prominent buttons on cards and in modal.
 */

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';

// -- Helpers ------------------------------------------------------------------
function fmtDate(d) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function sourceLabel(src) {
  var map = { whatsapp: 'WhatsApp', sms: 'SMS', email: 'Email', qr: 'QR Code' };
  return map[src] || src || 'Unknown';
}

function getStatus(r) {
  if (r.status === 'resolved' || r.resolved === true) return 'Resolved';
  if (r.status === 'in_progress') return 'In Progress';
  return 'New';
}

function StatusBadge({ status }) {
  var styles = {
    'New':         'bg-orange-50 text-orange-500',
    'In Progress': 'bg-blue-50 text-blue-500',
    'Resolved':    'bg-green-50 text-green-600',
  };
  return (
    <span className={'text-[10px] font-semibold px-2 py-0.5 rounded-full ' + (styles[status] || 'bg-gray-100 text-gray-400')}>
      {status}
    </span>
  );
}

function UrgencyBadge({ item }) {
  var status   = getStatus(item);
  if (status === 'Resolved') return null;
  var rating   = item.rating || 5;
  var created  = new Date(item.created_at);
  var hoursAgo = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60));
  var daysAgo  = Math.floor(hoursAgo / 24);
  if (rating <= 2) {
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">{'Urgent'}</span>;
  }
  if (daysAgo >= 3) {
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">{daysAgo + 'd overdue'}</span>;
  }
  if (daysAgo >= 1) {
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-500">{daysAgo + 'd old'}</span>;
  }
  if (hoursAgo < 3) {
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">{'New'}</span>;
  }
  return null;
}

function StarRow({ rating }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map(function(s) {
        return (
          <span key={s} style={{ color: s <= (rating || 0) ? '#FBBF24' : '#E5E7EB', fontSize: '13px' }}>
            {'\u2605'}
          </span>
        );
      })}
    </span>
  );
}

function buildPages(page, total) {
  if (total <= 6) return Array.from({ length: total }, function(_, i) { return i + 1; });
  if (page <= 3)       return [1, 2, 3, '_d1', total];
  if (page >= total-2) return [1, '_d1', total-2, total-1, total];
  return [1, '_d1', page-1, page, page+1, '_d2', total];
}

// -- Detail / Reply modal -----------------------------------------------------
function FeedbackDetailModal({ item, onClose, onResolve, resolving }) {
  const [reply,  setReply]  = useState('');
  const [copied, setCopied] = useState(false);

  var status       = getStatus(item);
  var customer     = (item.customer_id && typeof item.customer_id === 'object') ? item.customer_id : null;
  var customerName = (customer && customer.name) ? customer.name : 'Anonymous';

  var handleCopy = function() {
    if (!reply.trim()) return;
    navigator.clipboard.writeText(reply).then(function() {
      setCopied(true);
      setTimeout(function() { setCopied(false); }, 2000);
    });
  };

  var hasDirectChannel = (
    (item.source === 'whatsapp' && customer && customer.phone) ||
    (item.source === 'sms'      && customer && customer.phone) ||
    (item.source === 'email'    && customer && customer.email)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-md max-h-[90vh] flex flex-col animate-slide-up">

        {/* Sticky header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-900">Feedback Details</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">{'\u2715'}</button>
        </div>

        {/* Scrollable body */}
        <div className="p-5 overflow-y-auto">

          {/* Customer profile row */}
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm shrink-0">
              {customerName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <p className="text-sm font-semibold text-gray-900">{customerName}</p>
                <StatusBadge status={status} />
                <UrgencyBadge item={item} />
              </div>
              <StarRow rating={item.rating} />
              {customer && customer.phone && (
                <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5">
                  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {customer.phone}
                </p>
              )}
              {customer && customer.email && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {customer.email}
                </p>
              )}
              {customer && customer._id && (
                <a href={'/dashboard/customers/' + customer._id}
                  className="text-xs text-purple-600 font-semibold mt-2 inline-flex items-center gap-0.5 hover:underline"
                  target="_blank" rel="noopener noreferrer">
                  {'View Customer \u2192'}
                </a>
              )}
            </div>
          </div>

          {/* Their feedback */}
          <div className="bg-gray-50 rounded-xl p-4 mb-3">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">
              {'Their Feedback'}
            </p>
            {item.feedback_text ? (
              <p className="text-sm text-gray-700 leading-relaxed">{item.feedback_text}</p>
            ) : (
              <p className="text-xs text-gray-400 italic">No written feedback provided.</p>
            )}
          </div>

          <p className="text-xs text-gray-400 mb-5">
            {fmtDate(item.created_at) + ' \u00b7 via ' + sourceLabel(item.source)}
          </p>

          {/* Reply composer */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Your Reply</label>
            <textarea
              value={reply}
              onChange={function(e) { setReply(e.target.value); }}
              placeholder={'Hi ' + customerName + ', thank you for your feedback\u2026'}
              rows={4}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 placeholder-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
            />
            {/* Copy button — solid purple when active, green tick when copied */}
            <button
              onClick={handleCopy}
              disabled={!reply.trim()}
              className={'w-full mt-2 flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-xl transition-colors ' +
                (copied
                  ? 'bg-green-500 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-30 disabled:cursor-not-allowed')}>
              {copied
                ? '\u2713 Copied to clipboard!'
                : (
                  <>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {'Copy Reply'}
                  </>
                )}
            </button>
            <p className="text-[10px] text-gray-400 mt-1.5 text-center">
              {'Paste and send via WhatsApp, SMS, or Email.'}
            </p>
          </div>

          {/* Resolve + Close */}
          {status !== 'Resolved' && onResolve && (
            <button
              onClick={function() { onResolve(item._id); }}
              disabled={resolving === item._id}
              className="btn-primary w-full justify-center mb-2">
              {resolving === item._id ? <><span className="spinner" />{' Marking\u2026'}</> : '\u2713 Mark as Resolved'}
            </button>
          )}
          <button onClick={onClose} className="btn-secondary w-full justify-center">Close</button>
        </div>
      </div>
    </div>
  );
}

// -- Main page ----------------------------------------------------------------
function FeedbackPage() {
  const [activeTab,   setActiveTab]   = useState('unresolved');
  const [items,       setItems]       = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [counts,      setCounts]      = useState({ unresolved: 0, resolved: 0 });
  const [countsReady, setCountsReady] = useState(false);
  const [resolving,   setResolving]   = useState(null);
  const [viewItem,    setViewItem]    = useState(null);

  const LIMIT = 10;

  useEffect(function() {
    Promise.all([
      api.get('/reviews/private?limit=1&is_resolved=false'),
      api.get('/reviews/private?limit=1&is_resolved=true'),
    ]).then(function(results) {
      setCounts({ unresolved: results[0].data.total || 0, resolved: results[1].data.total || 0 });
      setCountsReady(true);
    }).catch(function() { setCountsReady(true); });
  }, []);

  const load = useCallback(async function() {
    setLoading(true);
    setError('');
    try {
      var isResolved = activeTab === 'resolved' ? 'true' : 'false';
      var params = new URLSearchParams({ page, limit: LIMIT, is_resolved: isResolved });
      var res = await api.get('/reviews/private?' + params.toString());
      setItems(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (e) {
      setError('Failed to load feedback.');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab]);

  useEffect(function() { load(); }, [load]);

  var handleTabChange = function(tab) { setActiveTab(tab); setPage(1); };

  var markResolved = async function(id) {
    setResolving(id);
    try {
      await api.patch('/reviews/' + id + '/resolve');
      setItems(function(prev) { return prev.filter(function(r) { return r._id !== id; }); });
      setTotal(function(t) { return Math.max(0, t - 1); });
      setCounts(function(prev) {
        return { unresolved: Math.max(0, prev.unresolved - 1), resolved: prev.resolved + 1 };
      });
      setViewItem(null);
    } catch (e) {
      // silently ignore
    } finally {
      setResolving(null);
    }
  };

  var totalPages = Math.ceil(total / LIMIT);

  var TABS = [
    { key: 'unresolved', label: 'Needs Attention', count: counts.unresolved },
    { key: 'resolved',   label: 'Resolved',        count: counts.resolved   },
  ];

  return (
    <DashboardLayout>

      {viewItem && (
        <FeedbackDetailModal
          item={viewItem}
          onClose={function() { setViewItem(null); }}
          onResolve={markResolved}
          resolving={resolving} />
      )}

      {/* Tab bar */}
      <div className="flex items-center border-b border-gray-200 mb-4">
        <div className="flex flex-1">
          {TABS.map(function(tab) {
            return (
              <button
                key={tab.key}
                onClick={function() { handleTabChange(tab.key); }}
                className={'pb-3 mr-5 text-sm font-semibold border-b-2 -mb-px transition-colors duration-150 ' +
                  (activeTab === tab.key
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600')}>
                {tab.label + (countsReady ? ' (' + tab.count + ')' : '')}
              </button>
            );
          })}
        </div>
        <button className="mb-3 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 9h10M11 14h2" />
          </svg>
        </button>
      </div>

      {error && <div className="alert-error mb-4"><span>{'\u26A0'}</span><span>{error}</span></div>}

      {/* List — no overflow-hidden so nothing clips */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4">
        {loading ? (
          Array.from({ length: 4 }).map(function(_, i) {
            return (
              <div key={i} className="flex items-start gap-3 px-4 py-4 border-b border-gray-100 last:border-0">
                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="flex gap-2">
                    <div className="h-3.5 bg-gray-200 rounded-full animate-pulse w-20" />
                    <div className="h-4 bg-gray-100 rounded-full animate-pulse w-14" />
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full animate-pulse w-16" />
                  <div className="h-3 bg-gray-100 rounded-full animate-pulse w-52" />
                  <div className="h-3 bg-gray-100 rounded-full animate-pulse w-36" />
                </div>
              </div>
            );
          })
        ) : items.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center px-6">
            <p className="text-4xl mb-3">{activeTab === 'unresolved' ? '\u2705' : '\u2713'}</p>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              {activeTab === 'unresolved' ? 'All caught up!' : 'No resolved feedback yet'}
            </p>
            <p className="text-xs text-gray-400">
              {activeTab === 'unresolved' ? 'No unresolved feedback. Great work!' : 'Resolved items will appear here.'}
            </p>
          </div>
        ) : (
          items.map(function(r) {
            var status     = getStatus(r);
            var isResolved = status === 'Resolved';
            return (
              <div key={r._id}
                className="flex items-start gap-3 px-4 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors duration-100">

                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm shrink-0 mt-0.5">
                  {((r.customer_id && r.customer_id.name) ? r.customer_id.name : 'A').charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name + badges row */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">
                      {(r.customer_id && r.customer_id.name) ? r.customer_id.name : 'Anonymous'}
                    </p>
                    <StatusBadge status={status} />
                    <UrgencyBadge item={r} />
                  </div>

                  <StarRow rating={r.rating} />

                  {r.feedback_text && (
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed"
                      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {r.feedback_text}
                    </p>
                  )}

                  {/* Date + action buttons row */}
                  <div className="flex items-center justify-between mt-3 gap-2">
                    <p className="text-[10px] text-gray-400 shrink-0">
                      {fmtDate(r.created_at) + ' \u00b7 via ' + sourceLabel(r.source)}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {!isResolved && (
                        <button
                          onClick={function(e) { e.stopPropagation(); markResolved(r._id); }}
                          disabled={resolving === r._id}
                          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white disabled:opacity-40 transition-colors">
                          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {'Resolve'}
                        </button>
                      )}
                      <button
                        onClick={function() { setViewItem(r); }}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors">
                        {isResolved ? 'View' : 'Reply'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400 order-2 sm:order-1">
            {'Showing ' + ((page-1)*LIMIT+1) + ' to ' + Math.min(page*LIMIT, total) + ' of ' + total.toLocaleString()}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-0.5 order-1 sm:order-2">
              <button onClick={function() { setPage(function(p) { return p-1; }); }} disabled={page===1}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                {'\u2039'}
              </button>
              {buildPages(page, totalPages).map(function(p) {
                return p === '_d1' || p === '_d2' ? (
                  <span key={p} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">{'\u2026'}</span>
                ) : (
                  <button key={p} onClick={function() { setPage(p); }}
                    className={'w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors ' +
                      (p === page ? 'text-white' : 'text-gray-500 hover:bg-gray-100')}
                    style={p === page ? { backgroundColor: '#7C3AED' } : {}}>
                    {p}
                  </button>
                );
              })}
              <button onClick={function() { setPage(function(p) { return p+1; }); }} disabled={page===totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                {'\u203A'}
              </button>
            </div>
          )}
        </div>
      )}

    </DashboardLayout>
  );
}

export default withAuth(FeedbackPage);