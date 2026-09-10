/**
 * pages/dashboard/refer-a-business.jsx
 * Engine B — owner-facing page for referring other businesses to
 * ReviewBooster. Shows their personal code/link, a running tally, and the
 * list of businesses they've referred (with credit status). Nothing here
 * is automatic — the "credited" flag is only ever set by a super_admin.
 */
import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';

function fmtDate(d) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ReferABusinessPage() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [copied,  setCopied]  = useState(false);

  useEffect(function() {
    api.get('/business-referrals/my-stats')
      .then(function(res) { setStats(res.data.data); })
      .catch(function(err) { setError(err.response?.data?.error || 'Failed to load your referral info.'); })
      .finally(function() { setLoading(false); });
  }, []);

  var joinUrl = stats && typeof window !== 'undefined'
    ? window.location.origin + '/signup?ref=' + stats.code
    : '';

  function handleCopy() {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl).then(function() {
      setCopied(true);
      setTimeout(function() { setCopied(false); }, 2000);
    }).catch(function() {});
  }

  function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: 'Join ReviewBooster', url: joinUrl }).catch(function() {});
    } else {
      handleCopy();
    }
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Refer a Business</h1>
        <p className="page-subtitle">Know another business owner who'd like ReviewBooster? Send them your link.</p>
      </div>

      {error && <div className="alert-error mb-5"><span>{'!'}</span><span>{error}</span></div>}

      {loading ? (
        <div className="space-y-4">
          <div className="h-32 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          <div className="h-40 bg-white rounded-2xl border border-gray-100 animate-pulse" />
        </div>
      ) : stats ? (
        <>
          {stats.reward_text && (
            <div className="rounded-2xl bg-purple-50 border border-purple-100 px-4 py-3 mb-5">
              <p className="text-sm font-semibold text-purple-700">{'\uD83C\uDF81 ' + stats.reward_text}</p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Your link</p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 mb-3">
              <p className="text-xs text-gray-600 truncate flex-1 font-mono">{joinUrl}</p>
              <button onClick={handleCopy} className="shrink-0 text-xs font-semibold text-purple-600 hover:underline">
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <button onClick={handleShare} className="btn-primary w-full justify-center">
              Share Your Link
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.total_referred}</p>
              <p className="text-[11px] text-gray-400 mt-1">Referred</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-amber-500">{stats.pending_credits}</p>
              <p className="text-[11px] text-gray-400 mt-1">Pending</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.given_credits}</p>
              <p className="text-[11px] text-gray-400 mt-1">Credited</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {stats.referrals.length === 0 ? (
              <div className="empty-state">
                <p className="empty-icon">{'\uD83C\uDF1F'}</p>
                <p className="empty-title">No referrals yet</p>
                <p className="empty-desc">Share your link above with another business owner to get started.</p>
              </div>
            ) : (
              stats.referrals.map(function(r, i) {
                return (
                  <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{r.business_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDate(r.created_at)}</p>
                    </div>
                    <span className={'text-[10px] font-semibold px-2.5 py-1 rounded-full ' + (r.credited ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600')}>
                      {r.credited ? 'Credited' : 'Pending'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : null}
    </DashboardLayout>
  );
}

export default withAuth(ReferABusinessPage, { requiredRole: 'owner' });
