/**
 * pages/owner/overview.jsx
 *
 * Phase 4 (Owner Dashboard spec, section 4 "Overview and filters", section
 * 13 implementation sequence): real combined KPIs, a location filter, a
 * date-range filter, and a per-branch comparison table -- replacing the
 * Phase 2 first version, which only showed combined numbers with no
 * filters.
 *
 *   - Location filter: "All locations" (default -- spec's "all authorized
 *     locations are selected by default") or any single location. Changing
 *     it re-queries /analytics/summary with &location_id=, which the
 *     backend re-validates server-side (a branch manager could never see
 *     this page, since it's owner-only, but the same backend filter is
 *     shared with endpoints they do use).
 *   - Date range filter: 7 / 30 / 90 days, or a custom start/end pair --
 *     passed straight through to /analytics/summary's existing ?days= /
 *     ?start_date&end_date= params.
 *   - Branch comparison: GET /analytics/by-location, shown only when
 *     "All locations" is selected and there's more than one location --
 *     comparing a single branch against itself isn't useful.
 *
 * Scope label always states both the location scope and the period, per
 * the spec's "Clearly label the period and location scope" display rule.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import OwnerDashboardLayout from '../../components/OwnerDashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const RANGE_PRESETS = [
  { key: '7',  label: '7 days' },
  { key: '30', label: '30 days' },
  { key: '90', label: '90 days' },
  { key: 'custom', label: 'Custom' },
];

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs font-semibold text-gray-400 mb-1.5">{label}</p>
      <p className={'text-2xl font-bold leading-none ' + (accent || 'text-gray-900')}>{value}</p>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <OwnerDashboardLayout title="Overview" subtitle="Loading…">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(function(i) {
          return <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />;
        })}
      </div>
    </OwnerDashboardLayout>
  );
}

function BranchComparisonTable({ rows }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
      <div className="px-5 pt-4 pb-1">
        <h2 className="text-sm font-bold text-gray-900">Branch comparison</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
              <th className="px-5 py-2 font-semibold">Location</th>
              <th className="px-3 py-2 font-semibold text-right">Reviews</th>
              <th className="px-3 py-2 font-semibold text-right">Google</th>
              <th className="px-3 py-2 font-semibold text-right">Private</th>
              <th className="px-3 py-2 font-semibold text-right">Avg Rating</th>
              <th className="px-5 py-2 font-semibold text-right">Conversion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(function(row) {
              return (
                <tr key={row.location_id || 'unassigned'}>
                  <td className="px-5 py-2.5 min-w-0">
                    <span className="font-medium text-gray-800">{row.name}</span>
                    {row.is_default && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-purple-500">Default</span>
                    )}
                    {row.status === 'inactive' && (
                      <span className="ml-2 text-[10px] font-semibold text-gray-400">Inactive</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{row.total_reviews}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-600">{row.total_public}</td>
                  <td className="px-3 py-2.5 text-right text-amber-600">{row.total_private}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{row.avg_rating ? row.avg_rating.toFixed(1) : '—'}</td>
                  <td className="px-5 py-2.5 text-right text-purple-600 font-semibold">{Math.round((row.conversion_rate || 0) * 100)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OwnerOverviewPage() {
  const { user } = useAuth();
  const [locations, setLocations] = useState(null);
  const [locationId, setLocationId] = useState(''); // '' = all locations
  const [rangeKey, setRangeKey] = useState('30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [summary, setSummary] = useState(null);
  const [byLocation, setByLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Locations list loads once -- it drives the filter dropdown and doesn't
  // depend on the filters themselves.
  useEffect(function() {
    let cancelled = false;
    api.get('/locations')
      .then(function(res) { if (!cancelled) setLocations(res.data.data || []); })
      .catch(function() { if (!cancelled) setLocations([]); });
    return function() { cancelled = true; };
  }, []);

  const dateParams = useMemo(function() {
    if (rangeKey === 'custom') {
      if (!customStart || !customEnd) return null;
      return { start_date: customStart, end_date: customEnd };
    }
    return { days: rangeKey };
  }, [rangeKey, customStart, customEnd]);

  useEffect(function() {
    if (!dateParams) return; // custom range not fully picked yet
    let cancelled = false;
    setLoading(true);
    setError('');

    const params = Object.assign({}, dateParams);
    if (locationId) params.location_id = locationId;

    const requests = [api.get('/analytics/summary', { params })];
    if (!locationId) requests.push(api.get('/analytics/by-location', { params: dateParams }));

    Promise.all(requests)
      .then(function(results) {
        if (cancelled) return;
        setSummary(results[0].data.data);
        setByLocation(locationId ? null : (results[1].data.data || []));
      })
      .catch(function() {
        if (!cancelled) setError('Could not load your overview right now.');
      })
      .finally(function() {
        if (!cancelled) setLoading(false);
      });

    return function() { cancelled = true; };
  }, [locationId, dateParams]);

  if (loading && !summary) return <OverviewSkeleton />;

  const activeLocations = (locations || []).filter(function(l) { return l.status === 'active'; });
  const selectedLocation = (locations || []).find(function(l) { return l._id === locationId; });

  const periodLabel = rangeKey === 'custom'
    ? (customStart && customEnd ? (customStart + ' to ' + customEnd) : 'Custom range')
    : ('Last ' + rangeKey + ' days');

  const scopeLabel = (selectedLocation
    ? selectedLocation.name
    : (activeLocations.length === 1 ? '1 location' : activeLocations.length + ' locations, combined')
  ) + ' · ' + periodLabel;

  return (
    <OwnerDashboardLayout
      title={'Welcome back, ' + ((user?.name || '').split(' ')[0] || 'Owner')}
      subtitle={scopeLabel}
    >
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mb-4 text-red-500 text-xs">
          <span>{'⚠️'}</span>
          <span>{error}</span>
        </div>
      )}

      {/* -- Filters ------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <select
          value={locationId}
          onChange={function(e) { setLocationId(e.target.value); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 font-medium outline-none focus:ring-2 focus:ring-purple-200 cursor-pointer"
        >
          <option value="">All locations</option>
          {(locations || []).map(function(loc) {
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

      {rangeKey === 'custom' && (!customStart || !customEnd) ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-sm text-gray-400 mb-6">
          Pick both a start and end date to see this range.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label="Total Reviews"    value={summary?.total_reviews ?? 0} />
            <StatCard label="Google Reviews"   value={summary?.total_public ?? 0} accent="text-emerald-600" />
            <StatCard label="Private Feedback" value={summary?.total_private ?? 0} accent="text-amber-600" />
            <StatCard
              label="Average Rating"
              value={summary?.avg_rating ? summary.avg_rating.toFixed(1) : '—'}
              accent="text-purple-600"
            />
          </div>

          {byLocation && byLocation.length > 1 && (
            <BranchComparisonTable rows={byLocation} />
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900">Your locations</h2>
              <Link href="/owner/locations" className="text-xs font-semibold text-purple-600 hover:text-purple-700">
                Manage {'→'}
              </Link>
            </div>
            {(locations || []).length === 0 ? (
              <p className="text-sm text-gray-400">No locations found.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {locations.map(function(loc) {
                  return (
                    <div key={loc._id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {loc.name}
                          {loc.is_default && (
                            <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-purple-500">Default</span>
                          )}
                        </p>
                        {loc.address && <p className="text-xs text-gray-400 truncate">{loc.address}</p>}
                      </div>
                      <span className={'shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ' +
                        (loc.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400')}>
                        {loc.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link href="/owner/analytics" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-purple-200 transition-colors">
              <p className="text-sm font-semibold text-gray-800">View Analytics {'→'}</p>
              <p className="text-xs text-gray-400 mt-1">Trends and comparisons across branches</p>
            </Link>
            <Link href="/owner/reviews" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-purple-200 transition-colors">
              <p className="text-sm font-semibold text-gray-800">View Reviews {'→'}</p>
              <p className="text-xs text-gray-400 mt-1">Public and private feedback</p>
            </Link>
            <Link href="/owner/team" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-purple-200 transition-colors">
              <p className="text-sm font-semibold text-gray-800">Team & Permissions {'→'}</p>
              <p className="text-xs text-gray-400 mt-1">Branch managers and access</p>
            </Link>
          </div>
        </>
      )}
    </OwnerDashboardLayout>
  );
}

export default withAuth(OwnerOverviewPage, { requiredRole: 'owner' });
