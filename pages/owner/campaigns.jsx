/**
 * pages/owner/campaigns.jsx
 *
 * Phase 5 (Owner Dashboard spec, "Reviews, Analytics and Campaigns"):
 * Campaigns, per Vivek's final spec for this page -- a lightweight
 * monitoring/management hub over EXISTING review-generation activity
 * (QR codes + review requests), not a new campaign-creation system.
 * "A QR code, a message template and a review request are not
 * automatically three separate campaigns" -- so this page invents no
 * campaign records, no statuses, no conversion metric we can't actually
 * measure honestly.
 *
 * Entirely backed by data Phase 3/4 already shipped -- no new backend
 * endpoint needed:
 *   - GET /locations          -- branch list + status (Phase 3)
 *   - GET /analytics/by-location?days=/start_date&end_date= -- per-branch
 *     requests-sent rollup for a period (Phase 4)
 *
 * Branch selection (all / one / compare a few) and the summary numbers
 * are all computed client-side from that one by-location fetch -- the
 * backend endpoint already returns every branch's row, so narrowing to a
 * subset for "compare branches" needs no extra request.
 *
 * No "Template" column: there's no per-branch template relationship
 * stored anywhere today (message templates are business-wide, not
 * per-location) -- adding that column would be exactly the kind of
 * fabricated data point the spec says not to show.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import OwnerDashboardLayout from '../../components/OwnerDashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';

const RANGE_PRESETS = [
  { key: '7',  label: '7 days' },
  { key: '30', label: '30 days' },
  { key: '90', label: '90 days' },
  { key: 'custom', label: 'Custom' },
];

function SummaryCard({ label, value, hint }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs font-semibold text-gray-400 mb-1.5">{label}</p>
      <p className="text-2xl font-bold leading-none text-gray-900">{value}</p>
      {hint && <p className="text-[10px] text-gray-400 mt-1.5">{hint}</p>}
    </div>
  );
}

function OwnerCampaignsPage() {
  const [locations, setLocations] = useState(null);
  const [rows, setRows] = useState(null); // by-location rows, unfiltered by scope
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // scope: 'all' | 'one' | 'compare'
  const [scope, setScope] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]); // used for 'one' and 'compare'

  const [rangeKey, setRangeKey] = useState('30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [sortDir, setSortDir] = useState('desc'); // by requests sent

  useEffect(function() {
    api.get('/locations').then(function(res) {
      setLocations(res.data.data || []);
    }).catch(function() {});
  }, []);

  const dateParams = useMemo(function() {
    if (rangeKey === 'custom') {
      if (!customStart || !customEnd) return null;
      return { start_date: customStart, end_date: customEnd };
    }
    return { days: rangeKey };
  }, [rangeKey, customStart, customEnd]);

  useEffect(function() {
    if (!dateParams) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    api.get('/analytics/by-location', { params: dateParams })
      .then(function(res) {
        if (cancelled) return;
        // Drop the synthetic "Unassigned" row (location_id: null) -- it
        // isn't a real branch, so it doesn't belong in a branch
        // comparison table or its totals.
        setRows((res.data.data || []).filter(function(r) { return r.location_id; }));
      })
      .catch(function() {
        if (!cancelled) setError('Could not load campaign activity right now.');
      })
      .finally(function() {
        if (!cancelled) setLoading(false);
      });
    return function() { cancelled = true; };
  }, [dateParams]);

  function toggleSelected(id) {
    setSelectedIds(function(prev) {
      const idStr = String(id);
      return prev.some(function(x) { return String(x) === idStr; })
        ? prev.filter(function(x) { return String(x) !== idStr; })
        : prev.concat([id]);
    });
  }

  function handleClearFilters() {
    setScope('all');
    setSelectedIds([]);
    setRangeKey('30');
    setCustomStart('');
    setCustomEnd('');
    setSortDir('desc');
  }

  const visibleRows = useMemo(function() {
    if (!rows) return [];
    let list = rows;
    if (scope === 'one' && selectedIds.length > 0) {
      list = list.filter(function(r) { return String(r.location_id) === String(selectedIds[0]); });
    } else if (scope === 'compare' && selectedIds.length > 0) {
      const idSet = selectedIds.map(String);
      list = list.filter(function(r) { return idSet.includes(String(r.location_id)); });
    }
    const sorted = list.slice().sort(function(a, b) {
      return sortDir === 'desc'
        ? b.total_requests_sent - a.total_requests_sent
        : a.total_requests_sent - b.total_requests_sent;
    });
    return sorted;
  }, [rows, scope, selectedIds, sortDir]);

  const totalRequestsSent = visibleRows.reduce(function(sum, r) { return sum + (r.total_requests_sent || 0); }, 0);
  const locationsWithActivity = visibleRows.filter(function(r) { return (r.total_requests_sent || 0) > 0; }).length;

  const periodLabel = rangeKey === 'custom'
    ? (customStart && customEnd ? (customStart + ' to ' + customEnd) : 'Custom range')
    : ('Last ' + rangeKey + ' days');

  const scopeLabel = scope === 'all'
    ? 'All locations'
    : scope === 'one'
      ? (selectedIds.length > 0 ? (locations || []).find(function(l) { return String(l._id) === String(selectedIds[0]); })?.name || '1 location' : 'Pick a location')
      : (selectedIds.length > 0 ? selectedIds.length + ' branches compared' : 'Pick branches to compare');

  const hasActiveFilters = scope !== 'all' || rangeKey !== '30';

  return (
    <OwnerDashboardLayout title="Campaigns" subtitle="Review-generation activity across your business">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mb-4 text-red-500 text-xs">
          <span>{'⚠️'}</span>
          <span>{error}</span>
        </div>
      )}

      {/* -- Filters ------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1 shrink-0">
          {[
            { key: 'all', label: 'All locations' },
            { key: 'one', label: 'Single branch' },
            { key: 'compare', label: 'Compare branches' },
          ].map(function(s) {
            return (
              <button
                key={s.key}
                type="button"
                onClick={function() { setScope(s.key); if (s.key === 'all') setSelectedIds([]); }}
                className={'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ' +
                  (scope === s.key ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1 shrink-0">
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

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="shrink-0 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors px-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {(scope === 'one' || scope === 'compare') && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-wrap gap-2">
          {(locations || []).map(function(loc) {
            const checked = selectedIds.some(function(x) { return String(x) === String(loc._id); });
            return (
              <button
                key={loc._id}
                type="button"
                onClick={function() {
                  if (scope === 'one') {
                    setSelectedIds([loc._id]);
                  } else {
                    toggleSelected(loc._id);
                  }
                }}
                className={'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ' +
                  (checked ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300')}
              >
                {loc.name}
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 mb-4">{scopeLabel} · {periodLabel}</p>

      {rangeKey === 'custom' && (!customStart || !customEnd) ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-sm text-gray-400 mb-6">
          Pick both a start and end date to see this range.
        </div>
      ) : loading && !rows ? (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[1, 2].map(function(i) { return <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />; })}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <SummaryCard label="Review requests sent" value={totalRequestsSent} hint="From actual tracking data" />
            <SummaryCard label="Locations with activity" value={locationsWithActivity} hint="Based on recorded activity" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
            <div className="px-5 pt-4 pb-1">
              <h2 className="text-sm font-bold text-gray-900">Branch activity</h2>
              <p className="text-xs text-gray-400 mt-0.5">Compare review-generation activity across your locations.</p>
            </div>
            {visibleRows.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">No branches in this scope.</div>
            ) : (
              <div className="divide-y divide-gray-50 mt-2">
                <div className="flex items-center justify-between px-5 py-1.5">
                  <span />
                  <button
                    type="button"
                    onClick={function() { setSortDir(function(d) { return d === 'desc' ? 'asc' : 'desc'; }); }}
                    className="text-[10px] font-semibold text-gray-400 hover:text-purple-600 transition-colors flex items-center gap-1"
                  >
                    Requests sent {sortDir === 'desc' ? '↓' : '↑'}
                  </button>
                </div>
                {visibleRows.map(function(row) {
                  return (
                    <div key={row.location_id} className="flex items-center justify-between px-5 py-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                          {'🏪'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {row.name}
                            {row.is_default && (
                              <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-purple-500">Default</span>
                            )}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {'QR code · Review requests'}
                            {row.status === 'inactive' && <span className="ml-1.5 text-gray-400">{'· Inactive'}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-bold text-gray-900 tabular-nums">{row.total_requests_sent}</p>
                        <p className="text-[10px] text-gray-400">Requests sent</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h2 className="text-sm font-bold text-gray-900">Review-generation tools</h2>
            </div>
            <div className="divide-y divide-gray-50">
              <Link href="/owner/locations" className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-gray-800">QR codes</p>
                  <p className="text-xs text-gray-400 mt-0.5">Manage each branch's QR code and status.</p>
                </div>
                <span className="text-gray-300">{'›'}</span>
              </Link>
              <Link href="/owner/reviews" className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Review requests</p>
                  <p className="text-xs text-gray-400 mt-0.5">Open request activity and tracking details.</p>
                </div>
                <span className="text-gray-300">{'›'}</span>
              </Link>
              <Link href="/owner/settings" className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Message templates</p>
                  <p className="text-xs text-gray-400 mt-0.5">Manage review-request message content. (Coming in Settings.)</p>
                </div>
                <span className="text-gray-300">{'›'}</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </OwnerDashboardLayout>
  );
}

export default withAuth(OwnerCampaignsPage, { requiredRole: 'owner' });
