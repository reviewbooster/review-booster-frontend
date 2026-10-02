/**
 * pages/dashboard/admin/business-health.jsx
 * Business hub -> Health. Platform-wide view of the same real signal every
 * Business 360 page already shows (expiry proximity, unresolved feedback,
 * incomplete onboarding) -- applied to every business at once. No fake
 * health score, no login/usage-decline tracking (not available yet).
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/DashboardLayout';
import withAuth from '../../../components/withAuth';
import api from '../../../lib/api';

function CountCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className={'text-3xl font-bold ' + color}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function BusinessRow({ b, severity }) {
  var pillCls = severity === 'at_risk' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700';
  return (
    <Link href={'/dashboard/admin/businesses/' + b.business_id}
      className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{b.business_name}</p>
        <p className="text-xs text-gray-500 truncate">{b.reasons.join(' \u00b7 ')}</p>
      </div>
      <span className={'shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ' + pillCls}>
        {severity === 'at_risk' ? 'At Risk' : 'Needs Attention'}
      </span>
    </Link>
  );
}

function toCsv(atRisk, needsAttention) {
  var header = ['Business', 'Status', 'Reasons'];
  var lines = [header.join(',')];
  function addRows(rows, status) {
    rows.forEach(function(b) {
      lines.push([
        '"' + (b.business_name || '').replace(/"/g, '""') + '"',
        status,
        '"' + b.reasons.join('; ').replace(/"/g, '""') + '"',
      ].join(','));
    });
  }
  addRows(atRisk, 'At Risk');
  addRows(needsAttention, 'Needs Attention');
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

function BusinessHealthPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(function() {
    api.get('/admin/business-health')
      .then(function(res) { setData(res.data.data); })
      .catch(function() { setError('Failed to load business health.'); })
      .finally(function() { setLoading(false); });
  }, []);

  return (
    <DashboardLayout>
      <div className="page-header flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Business Health</h1>
          <p className="page-subtitle">Real signals only: plan/trial expiry, unresolved feedback, incomplete onboarding.</p>
        </div>
        {data && (data.at_risk.length > 0 || data.needs_attention.length > 0) && (
          <button type="button"
            onClick={function() { downloadCsv('business-health-' + new Date().toISOString().slice(0, 10) + '.csv', toCsv(data.at_risk, data.needs_attention)); }}
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-purple-300 transition-colors">
            {'\u2B07 Export CSV'}
          </button>
        )}
      </div>

      {error && <div className="alert-error mb-5"><span>!</span><span>{error}</span></div>}

      {loading ? (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {Array.from({ length: 3 }).map(function(_, i) {
            return <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />;
          })}
        </div>
      ) : data && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <CountCard label="Healthy" value={data.counts.healthy} color="text-green-600" />
            <CountCard label="Needs Attention" value={data.counts.needs_attention} color="text-amber-600" />
            <CountCard label="At Risk" value={data.counts.at_risk} color="text-red-600" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">At-Risk Businesses</h3>
            <p className="text-xs text-gray-400 mb-3">Not something the owner needs to know about -- this is for you to follow up.</p>
            {data.at_risk.length === 0 ? (
              <p className="text-xs text-gray-400 py-4">None right now.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.at_risk.map(function(b) {
                  return <BusinessRow key={b.business_id} b={b} severity="at_risk" />;
                })}
              </div>
            )}
          </div>

          {data.needs_attention.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Needs Attention</h3>
              <div className="divide-y divide-gray-50">
                {data.needs_attention.map(function(b) {
                  return <BusinessRow key={b.business_id} b={b} severity="needs_attention" />;
                })}
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

export default withAuth(BusinessHealthPage);