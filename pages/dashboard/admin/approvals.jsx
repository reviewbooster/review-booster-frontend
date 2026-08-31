import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import withAuth from '../../../components/withAuth';
import api from '../../../lib/api';

const TABS = [
  { key: 'pending',  label: 'Pending'  },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

function ApprovalsPage() {
  const [tab,        setTab]        = useState('pending');
  const [businesses, setBusinesses] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [acting,     setActing]     = useState(null);

  const load = useCallback(async function() {
    setLoading(true);
    try {
      var res = await api.get('/admin/businesses?status=' + tab);
      setBusinesses(res.data.businesses || []);
    } catch (e) {
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(function() { load(); }, [load]);

  async function handleApprove(id) {
    setActing(id);
    try {
      await api.put('/admin/businesses/' + id + '/approve');
      load();
    } catch (e) {
      alert('Failed to approve. Please try again.');
    } finally {
      setActing(null);
    }
  }

  async function handleReject(id) {
    if (!confirm('Reject this account? The owner will be notified by email.')) return;
    setActing(id);
    try {
      await api.put('/admin/businesses/' + id + '/reject');
      load();
    } catch (e) {
      alert('Failed to reject. Please try again.');
    } finally {
      setActing(null);
    }
  }

  function formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const AVATAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#0EA5E9'];

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto">

        <div className="mb-6">
          <h1 className="text-gray-900 font-bold text-xl md:text-2xl">Account Approvals</h1>
          <p className="text-gray-400 text-sm mt-1">Review and approve new business sign-up requests.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
          {TABS.map(function(t) {
            return (
              <button
                key={t.key}
                onClick={function() { setTab(t.key); }}
                className={'px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ' +
                  (tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-t-transparent rounded-full animate-spin"
              style={{ borderWidth: 3, borderStyle: 'solid', borderColor: '#7C3AED', borderTopColor: 'transparent' }} />
          </div>
        ) : businesses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <p className="text-gray-300 text-4xl mb-3">{'\u2713'}</p>
            <p className="text-gray-400 text-sm">No {tab} applications.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {businesses.map(function(b, i) {
              var owner    = b.owner;
              var isActing = acting === b._id;
              var color    = AVATAR_COLORS[i % AVATAR_COLORS.length];
              return (
                <div key={b._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-base font-bold shrink-0"
                        style={{ backgroundColor: color }}>
                        {b.name ? b.name[0].toUpperCase() : 'B'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-gray-900 font-semibold text-sm">{b.name}</p>
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 text-xs capitalize">
                            {b.type}
                          </span>
                        </div>
                        {owner && (
                          <div className="mt-1.5">
                            <p className="text-gray-600 text-xs font-medium">{owner.name}</p>
                            <p className="text-gray-400 text-xs">{owner.email}</p>
                          </div>
                        )}
                        <p className="text-gray-300 text-xs mt-2">Applied {formatDate(b.created_at)}</p>
                      </div>
                    </div>

                    {tab === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={function() { handleReject(b._id); }}
                          disabled={isActing}
                          className="px-4 py-2 rounded-xl bg-red-50 border border-red-100 text-red-500 text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50">
                          Reject
                        </button>
                        <button
                          onClick={function() { handleApprove(b._id); }}
                          disabled={isActing}
                          className="px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                          {isActing ? (
                            <span className="w-4 h-4 rounded-full animate-spin inline-block"
                              style={{ borderWidth: 2, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                          ) : (
                            <span>{'\u2713'}</span>
                          )}
                          Approve
                        </button>
                      </div>
                    )}

                    {tab === 'approved' && (
                      <span className="px-3 py-1 rounded-full bg-green-50 text-green-600 text-xs font-semibold shrink-0">
                        Approved
                      </span>
                    )}
                    {tab === 'rejected' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-3 py-1 rounded-full bg-red-50 text-red-500 text-xs font-semibold">Rejected</span>
                        <button
                          onClick={function() { handleApprove(b._id); }}
                          disabled={isActing}
                          className="px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50">
                          {isActing ? '...' : '\u2713'} Approve
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default withAuth(ApprovalsPage);