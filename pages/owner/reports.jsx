/**
 * pages/owner/reports.jsx
 *
 * Phase 6 (Owner Dashboard spec, "Settings and Reports"), replacing the
 * Phase 2 placeholder. Surfaces the existing analytics PDF export
 * (GET /analytics/export, already location-aware as of Phase 4/5) as its
 * own page, rather than building a separate reporting engine.
 *
 * Deliberately NOT built: saved/scheduled report history. The backend has
 * no concept of a stored "report" record -- /analytics/export generates a
 * PDF on demand from live data and nothing is persisted server-side after
 * that. Claiming a report history or scheduling here would be exactly the
 * kind of fabricated feature the Campaigns spec explicitly warned against
 * ("do not invent campaign statuses if the application doesn't support
 * them") -- the same principle applies here. This page is an honest
 * "generate a report right now, for this location and period" tool.
 */
import { useEffect, useState } from 'react';
import OwnerDashboardLayout from '../../components/OwnerDashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';

const RANGE_PRESETS = [
  { key: '7',  label: '7 days' },
  { key: '30', label: '30 days' },
  { key: '90', label: '90 days' },
  { key: 'custom', label: 'Custom' },
];

function OwnerReportsPage() {
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState(''); // '' = all locations
  const [rangeKey, setRangeKey] = useState('30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(function() {
    api.get('/locations').then(function(res) {
      setLocations(res.data.data || []);
    }).catch(function() {});
  }, []);

  function buildQuery() {
    let q = rangeKey === 'custom'
      ? 'start_date=' + customStart + '&end_date=' + customEnd
      : 'days=' + rangeKey;
    if (locationId) q += '&location_id=' + locationId;
    return q;
  }

  const rangeReady = rangeKey !== 'custom' || (customStart && customEnd);

  async function handleGenerate() {
    if (!rangeReady) return;
    setGenerating(true);
    setError('');
    setNotice('');
    try {
      const res = await api.get('/analytics/export?' + buildQuery(), { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'analytics-report-' + new Date().toISOString().slice(0, 10) + '.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setNotice('Report downloaded.');
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.code === 'PLAN_LOCKED') {
        setError(err.response.data.error || 'Reports aren’t available on your current plan.');
      } else {
        setError('Could not generate that report. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  }

  const selectedLocationName = (locations.find(function(l) { return l._id === locationId; }) || {}).name;
  const periodLabel = rangeKey === 'custom'
    ? (customStart && customEnd ? (customStart + ' to ' + customEnd) : 'Pick a date range')
    : ('Last ' + rangeKey + ' days');

  return (
    <OwnerDashboardLayout title="Reports" subtitle="Generate a PDF report for any location and period">
      {notice && <div className="alert-success mb-4"><span>{'✓'}</span><span>{notice}</span></div>}
      {error && <div className="alert-error mb-4"><span>{'⚠'}</span><span>{error}</span></div>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Analytics Report</h2>
        <p className="text-xs text-gray-400 mb-4">
          A branded PDF covering requests sent, review funnel, rating breakdown, channel performance, and top
          feedback themes -- for whichever location and period you pick below.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <select
            value={locationId}
            onChange={function(e) { setLocationId(e.target.value); }}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 font-medium outline-none focus:ring-2 focus:ring-purple-200 cursor-pointer"
          >
            <option value="">All locations</option>
            {locations.map(function(loc) {
              return <option key={loc._id} value={loc._id}>{loc.name}</option>;
            })}
          </select>

          <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1">
            {RANGE_PRESETS.map(function(r) {
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={function() { setRangeKey(r.key); }}
                  className={'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ' +
                    (rangeKey === r.key ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          {rangeKey === 'custom' && (
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={customStart}
                onChange={function(e) { setCustomStart(e.target.value); }}
                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-purple-200"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={function(e) { setCustomEnd(e.target.value); }}
                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 mb-4">{(selectedLocationName || 'All locations') + ' · ' + periodLabel}</p>

        <button
          type="button"
          disabled={generating || !rangeReady}
          onClick={handleGenerate}
          className="btn-primary disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate & Download PDF'}
        </button>
      </div>

      <p className="text-xs text-gray-400">
        Reports are generated on demand from your live data -- nothing is saved or scheduled yet.
      </p>
    </OwnerDashboardLayout>
  );
}

export default withAuth(OwnerReportsPage, { requiredRole: 'owner' });
