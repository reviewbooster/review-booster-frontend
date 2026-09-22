/**
 * pages/dashboard/follow-ups.jsx
 * Follow-up inbox -- everyone due for a follow-up, grouped into Due today,
 * Upcoming, and Done, so you can work through them in one place instead of
 * checking each customer's profile individually.
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';

function fmtDate(d) {
  if (!d) return '\u2014';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
  catch (_) { return '\u2014'; }
}

function isOverdue(d) {
  var due = new Date(d);
  var todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  return due < todayEnd && due.toDateString() !== new Date().toDateString();
}

function FollowUpsPage() {
  var router = useRouter();

  var [lists,   setLists]   = useState({ due: [], upcoming: [], done: [] });
  var [loading, setLoading] = useState(true);
  var [error,   setError]   = useState('');
  var [activeTab, setActiveTab] = useState('due');
  var [completingId, setCompletingId] = useState(null);
  var [toast, setToast] = useState('');

  var showToast = function (msg) {
    setToast(msg);
    setTimeout(function () { setToast(''); }, 3000);
  };

  var loadAll = useCallback(async function () {
    setLoading(true);
    setError('');
    try {
      var [dueRes, upcomingRes, doneRes] = await Promise.all([
        api.get('/follow-ups?status=due'),
        api.get('/follow-ups?status=upcoming'),
        api.get('/follow-ups?status=done'),
      ]);
      setLists({
        due:      dueRes.data.data || [],
        upcoming: upcomingRes.data.data || [],
        done:     doneRes.data.data || [],
      });
    } catch (_) {
      setError('Failed to load follow-ups.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(function () { loadAll(); }, [loadAll]);

  var handleComplete = async function (followUp) {
    var customerId = followUp.customer_id && followUp.customer_id._id;
    if (!customerId) return;
    setCompletingId(followUp._id);
    try {
      await api.post('/customers/' + customerId + '/follow-up/complete');
      showToast('Marked done!');
      loadAll();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to mark done.');
    } finally {
      setCompletingId(null);
    }
  };

  var TABS = [
    { key: 'due',      label: 'Due today', count: lists.due.length },
    { key: 'upcoming', label: 'Upcoming',  count: lists.upcoming.length },
    { key: 'done',     label: 'Done',      count: lists.done.length },
  ];

  var activeList = lists[activeTab] || [];

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Follow-ups</h1>
        <p className="page-subtitle">Everyone who needs a follow-up, in one place.</p>
      </div>

      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 alert-success shadow-lg animate-slide-up">
          <span>{'\u2713'}</span><span>{toast}</span>
        </div>
      )}

      {error && <div className="alert-error mb-4"><span>{'\u26A0'}</span><span>{error}</span></div>}

      <div className="grid grid-cols-3 gap-3 mb-5">
        {TABS.map(function (tab) {
          var active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={'rounded-2xl border p-4 text-center transition-colors ' +
                (active ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-100 hover:border-purple-200')}>
              <p className={'text-2xl font-bold ' + (active ? 'text-white' : 'text-gray-900')}>
                {loading ? '\u2014' : tab.count}
              </p>
              <p className={'text-xs mt-0.5 ' + (active ? 'text-purple-100' : 'text-gray-400')}>{tab.label}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          Array.from({ length: 3 }).map(function (_, i) {
            return <div key={i} className="h-16 border-b border-gray-100 last:border-0 animate-pulse bg-gray-50" />;
          })
        ) : activeList.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-3xl mb-2">{activeTab === 'done' ? '\u2705' : '\uD83D\uDC4D'}</p>
            <p className="text-sm font-medium text-gray-600">
              {activeTab === 'due' ? 'Nothing due today' : activeTab === 'upcoming' ? 'No upcoming follow-ups' : 'Nothing completed yet'}
            </p>
          </div>
        ) : (
          activeList.map(function (f) {
            var customer = f.customer_id || {};
            var overdue = activeTab === 'due' && isOverdue(f.due_date);
            return (
              <div
                key={f._id}
                onClick={() => customer._id && router.push('/dashboard/customers/' + customer._id)}
                className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors cursor-pointer">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">{customer.name || 'Unknown customer'}</p>
                    {overdue && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500 shrink-0">Overdue</span>
                    )}
                  </div>
                  {f.note && <p className="text-xs text-gray-400 mt-0.5 truncate">{f.note}</p>}
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {activeTab === 'done' ? fmtDate(f.completed_at) : fmtDate(f.due_date)}
                </span>
                {activeTab !== 'done' && (
                  <button
                    onClick={e => { e.stopPropagation(); handleComplete(f); }}
                    disabled={completingId === f._id}
                    className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50">
                    {completingId === f._id ? '\u2026' : 'Mark done'}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}

export default withAuth(FollowUpsPage);
