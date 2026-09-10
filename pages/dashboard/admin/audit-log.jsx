/**
 * pages/dashboard/admin/audit-log.jsx
 * Read-only feed of sensitive admin actions — who did what, to which
 * business, when. Paginated, most recent first.
 */
import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import withAuth from '../../../components/withAuth';
import api from '../../../lib/api';

function fmtDateTime(d) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ACTION_LABEL(action) {
  var map = {
    'business.delete': 'Business deleted',
    'business.reset_password': 'Password reset',
    'business.suspend': 'Business suspended',
    'business.enable': 'Business enabled',
    'billing.activate_plan': 'Plan activated',
    'billing.update_plan': 'Plan settings updated',
    'billing.update_platform_settings': 'Billing settings updated',
    'business_referral.mark_credited': 'Referral credit marked given',
    'business_referral.update_settings': 'Business referral settings updated',
  };
  return map[action] || action;
}

function AuditLogPage() {
  const [entries,  setEntries]  = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const LIMIT = 30;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/audit-log', { params: { page, limit: LIMIT } });
      setEntries(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      setError('Failed to load audit log.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(function() { load(); }, [page]);

  var totalPages = Math.ceil(total / LIMIT);

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Audit Log</h1>
        <p className="page-subtitle">A record of sensitive admin actions \u2014 who did what, when.</p>
      </div>

      {error && <div className="alert-error mb-5"><span>!</span><span>{error}</span></div>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
        {loading ? (
          Array.from({ length: 6 }).map(function(_, i) {
            return <div key={i} className="h-16 border-b border-gray-100 last:border-0 animate-pulse bg-gray-50" />;
          })
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <p className="empty-icon">{'\uD83D\uDCCB'}</p>
            <p className="empty-title">No activity logged yet</p>
            <p className="empty-desc">Sensitive actions like suspending a business or crediting a referral will show up here.</p>
          </div>
        ) : (
          entries.map(function(e) {
            return (
              <div key={e._id} className="flex items-start justify-between px-5 py-3.5 border-b border-gray-100 last:border-0">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-sm font-semibold text-gray-900">{ACTION_LABEL(e.action)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {e.actor_name || 'Unknown'}{e.actor_role ? ' (' + e.actor_role + ')' : ''}
                    {e.target_label ? ' \u2192 ' + e.target_label : ''}
                  </p>
                </div>
                <p className="text-xs text-gray-400 shrink-0">{fmtDateTime(e.created_at)}</p>
              </div>
            );
          })
        )}
      </div>

      {total > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">{'Showing ' + ((page - 1) * LIMIT + 1) + '\u2013' + Math.min(page * LIMIT, total) + ' of ' + total}</p>
          <div className="flex items-center gap-2">
            <button onClick={function() { setPage(function(p) { return Math.max(1, p - 1); }); }} disabled={page === 1}
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">Prev</button>
            <button onClick={function() { setPage(function(p) { return Math.min(totalPages, p + 1); }); }} disabled={page === totalPages}
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default withAuth(AuditLogPage);
