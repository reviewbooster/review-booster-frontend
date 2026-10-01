/**
 * pages/dashboard/admin/inbox.jsx
 * One combined queue for the two real things waiting on a super admin:
 * password reset requests and pre-login support chats. These are genuinely
 * different (a flagged account vs. an open conversation), so they render
 * differently, but both belong in one place instead of two separate pages.
 *
 * Left out on purpose: automatic category/priority classification and
 * "Billing"/"Technical" tags -- neither real source has that data, so
 * showing it would mean inventing it.
 */
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/DashboardLayout';
import withAuth from '../../../components/withAuth';
import api from '../../../lib/api';
import { ResetPasswordModal } from '../requests';

function fmtRelative(d) {
  if (!d) return '';
  var ms = Date.now() - new Date(d).getTime();
  var mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  var hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.floor(hrs / 24) + 'd ago';
}

function InboxPage() {
  const [resets,  setResets]  = useState([]);
  const [chats,   setChats]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [tab,     setTab]     = useState('all');
  const [toast,   setToast]   = useState('');
  const [resetTarget, setResetTarget] = useState(null);

  const showToast = function(msg) { setToast(msg); setTimeout(function() { setToast(''); }, 3000); };

  const load = useCallback(function() {
    setLoading(true);
    setError('');
    Promise.all([
      api.get('/business/reset-requests'),
      api.get('/admin/support-chats'),
    ]).then(function(results) {
      setResets(results[0].data.data || []);
      setChats(results[1].data.data || []);
    }).catch(function() {
      setError('Failed to load inbox.');
    }).finally(function() {
      setLoading(false);
    });
  }, []);

  useEffect(function() { load(); }, [load]);

  function handleReset(userId) {
    setResets(function(prev) { return prev.filter(function(r) { return r._id !== userId; }); });
    showToast('Password reset. Share credentials with the owner.');
  }

  var unreadChatCount = chats.filter(function(c) { return c.unread_by_admin; }).length;
  var total = resets.length + chats.length;

  var showResets = tab === 'all' || tab === 'resets';
  var showChats = tab === 'all' || tab === 'chats';

  return (
    <DashboardLayout>
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 alert-success shadow-lg animate-slide-up">
          <span>{'\u2713'}</span><span>{toast}</span>
        </div>
      )}
      {resetTarget && (
        <ResetPasswordModal user={resetTarget} onClose={function() { setResetTarget(null); }}
          onReset={function() { handleReset(resetTarget._id); }} />
      )}

      <div className="page-header">
        <h1 className="page-title">Inbox</h1>
        <p className="page-subtitle">{total} item{total !== 1 ? 's' : ''} waiting on you</p>
      </div>

      {error && <div className="alert-error mb-5"><span>!</span><span>{error}</span></div>}

      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { key: 'all', label: 'All (' + total + ')' },
          { key: 'resets', label: 'Password Resets (' + resets.length + ')' },
          { key: 'chats', label: 'Support Chats (' + chats.length + (unreadChatCount > 0 ? ', ' + unreadChatCount + ' unread' : '') + ')' },
        ].map(function(t) {
          var active = tab === t.key;
          return (
            <button key={t.key} type="button" onClick={function() { setTab(t.key); }}
              className={'text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ' +
                (active ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300')}>
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map(function(_, i) {
            return <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />;
          })}
        </div>
      ) : total === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p className="empty-icon">{'\u2713'}</p>
            <p className="empty-title">All caught up</p>
            <p className="empty-desc">No password resets or support chats need you right now.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {showResets && resets.map(function(r) {
            return (
              <div key={'reset-' + r._id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Password Reset</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {r.email + (r.business_id?.name ? ' \u00b7 ' + r.business_id.name : '')}
                  </p>
                </div>
                <button onClick={function() { setResetTarget(r); }}
                  className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors">
                  Reset Password
                </button>
              </div>
            );
          })}

          {showChats && chats.map(function(c) {
            return (
              <Link key={'chat-' + c._id} href="/dashboard/admin/support-chats"
                className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-purple-300 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Support Chat</span>
                      {c.unread_by_admin && <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />}
                      {c.status === 'closed' && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Closed</span>}
                    </div>
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.guest_name}</p>
                    <p className="text-xs text-gray-400 truncate">{c.last_message_preview}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-gray-400">{fmtRelative(c.last_message_at)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

export default withAuth(InboxPage);