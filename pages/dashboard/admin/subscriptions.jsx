/**
 * pages/dashboard/admin/subscriptions.jsx
 * Revenue hub -> Subscriptions. Every business's real plan status in one
 * sortable list (soonest renewal/expiry first), plus real counts by tier.
 * No MRR, no failed payments -- manual UPI billing has no gateway behind it,
 * so there's nothing honest to compute for those yet.
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/DashboardLayout';
import withAuth from '../../../components/withAuth';
import api from '../../../lib/api';

var STATUS_PILL = {
  trial:     { bg: 'bg-amber-50',   text: 'text-amber-700' },
  free:      { bg: 'bg-gray-100',   text: 'text-gray-600' },
  starter:   { bg: 'bg-blue-50',    text: 'text-blue-600' },
  growth:    { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  pro:       { bg: 'bg-indigo-50',  text: 'text-indigo-600' },
  suspended: { bg: 'bg-red-50',     text: 'text-red-600' },
};

function fmtDate(d) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusPill({ status }) {
  var p = STATUS_PILL[status] || STATUS_PILL.free;
  return <span className={'text-xs font-semibold px-2.5 py-1 rounded-full capitalize ' + p.bg + ' ' + p.text}>{status}</span>;
}

function CountCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-400 mt-1 capitalize">{label}</p>
    </div>
  );
}

function toCsv(rows) {
  var header = ['Business', 'Status', 'Renewal/Expiry', 'Days Left', 'Signed Up'];
  var lines = [header.join(',')];
  rows.forEach(function(r) {
    var cells = [
      '"' + (r.business_name || '').replace(/"/g, '""') + '"',
      r.status,
      r.renewal_date ? new Date(r.renewal_date).toISOString().slice(0, 10) : '',
      r.days_left != null ? r.days_left : '',
      new Date(r.created_at).toISOString().slice(0, 10),
    ];
    lines.push(cells.join(','));
  });
  return lines.join('\n');
}

function downloadCsv(filename, csvText) {
  var blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function SubscriptionsPage() {
  const [rows,    setRows]    = useState([]);
  const [counts,  setCounts]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [filter,  setFilter]  = useState('all');

  useEffect(function() {
    api.get('/admin/subscriptions')
      .then(function(res) {
        setRows(res.data.data.rows || []);
        setCounts(res.data.data.counts || null);
      })
      .catch(function() { setError('Failed to load subscriptions.'); })
      .finally(function() { setLoading(false); });
  }, []);

  var visible = filter === 'all' ? rows : rows.filter(function(r) { return r.status === filter; });

  return (
    <DashboardLayout>
      <div className="page-header flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Subscriptions</h1>
          <p className="page-subtitle">Real plan status per business, sorted by soonest renewal.</p>
        </div>
        {!loading && rows.length > 0 && (
          <button type="button"
            onClick={function() { downloadCsv('subscriptions-' + new Date().toISOString().slice(0, 10) + '.csv', toCsv(visible)); }}
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-purple-300 transition-colors">
            {'\u2B07 Export CSV'}
          </button>
        )}
      </div>

      {error && <div className="alert-error mb-5"><span>!</span><span>{error}</span></div>}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
          {Array.from({ length: 6 }).map(function(_, i) {
            return <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />;
          })}
        </div>
      ) : counts && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
          <CountCard label="On trial" value={counts.trial} />
          <CountCard label="Free" value={counts.free} />
          <CountCard label="Starter" value={counts.starter} />
          <CountCard label="Growth" value={counts.growth} />
          <CountCard label="Pro" value={counts.pro} />
          <CountCard label="Suspended" value={counts.suspended} />
        </div>
      )}

      <p className="text-[11px] text-gray-400 mb-4">
        MRR and failed-payment tracking aren't shown here -- billing is manual UPI with no payment gateway, so there's no real data source for those yet.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {['all', 'trial', 'free', 'starter', 'growth', 'pro', 'suspended'].map(function(f) {
          var active = filter === f;
          return (
            <button key={f} type="button" onClick={function() { setFilter(f); }}
              className={'text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors capitalize ' +
                (active ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300')}>
              {f}
            </button>
          );
        })}
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr><th>Business</th><th>Status</th><th>Renewal / Expiry</th><th>Signed up</th></tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map(function(_, i) {
                return (
                  <tr key={i}>{Array.from({ length: 4 }).map(function(_, j) {
                    return <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>;
                  })}</tr>
                );
              })
            ) : visible.length === 0 ? (
              <tr><td colSpan={4}>
                <div className="empty-state">
                  <p className="empty-icon">{'\uD83D\uDCB3'}</p>
                  <p className="empty-title">No matches</p>
                  <p className="empty-desc">Try a different filter.</p>
                </div>
              </td></tr>
            ) : visible.map(function(r) {
              var urgent = r.days_left !== null && r.days_left <= 3 && r.days_left >= 0;
              var expired = r.days_left !== null && r.days_left < 0;
              return (
                <tr key={r.business_id}>
                  <td>
                    <Link href={'/dashboard/admin/businesses/' + r.business_id} className="font-semibold text-gray-900 hover:text-purple-600 hover:underline">
                      {r.business_name}
                    </Link>
                  </td>
                  <td><StatusPill status={r.status} /></td>
                  <td>
                    <span className="text-gray-700">{fmtDate(r.renewal_date)}</span>
                    {r.days_left !== null && (
                      <span className={'ml-2 text-xs font-semibold ' + (expired ? 'text-red-500' : urgent ? 'text-amber-500' : 'text-gray-400')}>
                        {expired ? 'Expired' : r.days_left + 'd left'}
                      </span>
                    )}
                  </td>
                  <td className="text-gray-400 text-xs">{fmtDate(r.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(SubscriptionsPage);