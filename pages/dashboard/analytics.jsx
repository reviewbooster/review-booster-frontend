/**
 * pages/dashboard/analytics.jsx
 * Analytics -- Review Funnel, Reviews Over Time chart, and the private
 * feedback resolved/unresolved breakdown. Split out of the Home dashboard
 * so Home stays action-first and this page holds the deeper numbers.
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';

const PERIOD_OPTIONS = [
  { days: 7,  label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 3 months' },
];

function getDateRangeLabel(days) {
  const end   = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return fmt(start) + '\u00a0\u2013\u00a0' + fmt(end) + ', ' + end.getFullYear();
}

function formatChartDate(v) {
  if (!v) return '';
  const d = new Date(v);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* --- Single funnel row ----------------------------------------------------- */
function FunnelRow({ icon, isGoogle, label, value, pct, color }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-[18px] h-[18px] rounded-md flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + '22' }}
      >
        {isGoogle
          ? <span style={{ fontSize: '9px', fontWeight: 900, color: '#4285F4', lineHeight: 1 }}>G</span>
          : <span style={{ fontSize: '9px', color: color, lineHeight: 1 }}>{icon}</span>
        }
      </div>
      <span className="text-[11px] text-gray-500 shrink-0 whitespace-nowrap">{label}</span>
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: '5px', backgroundColor: '#F3F4F6' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: pct + '%', backgroundColor: color }}
        />
      </div>
      <span className="text-[11px] font-bold text-gray-700 tabular-nums shrink-0" style={{ width: '26px', textAlign: 'right' }}>{value}</span>
      <span className="text-[10px] text-gray-400 tabular-nums shrink-0" style={{ width: '36px', textAlign: 'right' }}>{pct + '%'}</span>
    </div>
  );
}

/* --- Loading skeleton ------------------------------------------------------ */
function DashboardSkeleton() {
  return (
    <DashboardLayout>
      <div className="mb-5">
        <div className="h-7 w-40 bg-gray-200 rounded-xl animate-pulse mb-3" />
        <div className="h-7 w-36 bg-gray-100 rounded-xl animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-52 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-52 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    </DashboardLayout>
  );
}

/* --- Main page ------------------------------------------------------------- */
function DashboardPage() {
  const [selectedDays,  setSelectedDays]  = useState(30);
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [customDaysInput, setCustomDaysInput] = useState('');
  const [dateMode,      setDateMode]      = useState('preset'); // 'preset' | 'range'
  const [rangeStart,    setRangeStart]    = useState('');
  const [rangeEnd,      setRangeEnd]      = useState('');
  const [rangeError,    setRangeError]    = useState('');
  const [summary,       setSummary]       = useState(null);
  const [chartData,     setChartData]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [fetching,      setFetching]      = useState(false);
  const [mounted,       setMounted]       = useState(false);
  const [error,         setError]         = useState('');
  const dropdownRef  = useRef(null);
  const firstLoadRef = useRef(true);

  useEffect(function() {
    setTimeout(function() {
      if (window.__rbStartDeepDive) window.__rbStartDeepDive('analytics');
    }, 50);
  }, []);

  useEffect(() => { setMounted(true); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  // Fetch data -- re-runs when selectedDays/dateMode/range changes
  useEffect(() => {
    const isFirst = firstLoadRef.current;
    if (isFirst) {
      firstLoadRef.current = false;
      setLoading(true);
    } else {
      setFetching(true);
    }
    setError('');

    const load = async () => {
      try {
        const query = dateMode === 'range' && rangeStart && rangeEnd
          ? 'start_date=' + rangeStart + '&end_date=' + rangeEnd
          : 'days=' + selectedDays;
        const [sumRes, chartRes] = await Promise.all([
          api.get('/analytics/summary?' + query),
          api.get('/analytics/reviews-over-time?' + query),
        ]);
        setSummary(sumRes.data.data);
        setChartData(chartRes.data.data || []);
      } catch {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
        setFetching(false);
      }
    };
    load();
  }, [selectedDays, dateMode, rangeStart, rangeEnd]);

  if (loading) return <DashboardSkeleton />;

  const handleCustomDaysApply = () => {
    const n = parseInt(customDaysInput, 10);
    if (n >= 1 && n <= 365) {
      setDateMode('preset');
      setSelectedDays(n);
      setDropdownOpen(false);
      setCustomDaysInput('');
    }
  };

  const handleRangeApply = () => {
    if (!rangeStart || !rangeEnd) {
      setRangeError('Pick both a start and end date.');
      return;
    }
    if (rangeStart > rangeEnd) {
      setRangeError('Start date must be before end date.');
      return;
    }
    setRangeError('');
    setDateMode('range');
    setDropdownOpen(false);
  };

  const today = new Date().toISOString().slice(0, 10);

  const total       = summary?.total_requests_sent || 0;
  const calcPct     = (v) => total > 0 ? Math.round(((v || 0) / total) * 100) : 0;
  const effectiveDays = dateMode === 'range' && rangeStart && rangeEnd
    ? Math.max(1, Math.round((new Date(rangeEnd) - new Date(rangeStart)) / 86400000) + 1)
    : selectedDays;

  // X-axis tick interval: show ~6 labels regardless of period length
  const chartInterval = effectiveDays <= 7 ? 0 : effectiveDays <= 30 ? 4 : 13;

  const funnelRows = [
    { icon: '\u25B8', isGoogle: false, label: 'Requests Sent',    value: total,                          pct: 100,                               color: '#60A5FA' },
    { icon: '\u2192', isGoogle: false, label: 'Delivered',        value: summary?.total_delivered  ?? 0, pct: calcPct(summary?.total_delivered),  color: '#2DD4BF' },
    { icon: '\u25CB', isGoogle: false, label: 'Opened',           value: summary?.total_opened     ?? 0, pct: calcPct(summary?.total_opened),     color: '#FBBF24' },
    { icon: '\u2713', isGoogle: false, label: 'Submitted',        value: summary?.total_reviews    ?? 0, pct: calcPct(summary?.total_reviews),    color: '#34D399' },
    { icon: '',       isGoogle: true,  label: 'Posted to Google', value: summary?.total_public     ?? 0, pct: calcPct(summary?.total_public),     color: '#818CF8' },
  ];

  const totalPrivate    = summary?.total_private ?? 0;
  const totalUnresolved = summary?.total_unresolved ?? 0;
  const totalResolved   = Math.max(0, totalPrivate - totalUnresolved);
  const calcFeedbackPct = (v) => totalPrivate > 0 ? Math.round(((v || 0) / totalPrivate) * 100) : 0;
  const feedbackStatusRows = [
    { icon: '\u2713', isGoogle: false, label: 'Resolved',   value: totalResolved,   pct: calcFeedbackPct(totalResolved),   color: '#34D399' },
    { icon: '\u26A0', isGoogle: false, label: 'Unresolved', value: totalUnresolved, pct: calcFeedbackPct(totalUnresolved), color: '#F87171' },
  ];

  return (
    <DashboardLayout>
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mb-4 text-red-500 text-xs">
          <span>{'\u26A0\uFE0F'}</span>
          <span>{error}</span>
        </div>
      )}

      {/* Title + date filter */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900 leading-tight mb-3">Analytics</h1>

        {/* Period dropdown */}
        <div className="relative inline-block" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={'inline-flex items-center gap-1.5 bg-white border rounded-xl px-3 py-1.5 text-[11px] font-medium shadow-sm transition-colors ' +
              (dropdownOpen ? 'border-purple-400 text-purple-600' : 'border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600')}
          >
            {'\uD83D\uDCC5\u00a0' +
              (dateMode === 'range' && rangeStart && rangeEnd
                ? new Date(rangeStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + '\u00a0\u2013\u00a0' + new Date(rangeEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : getDateRangeLabel(selectedDays)) +
              '\u00a0\u25BE'}
          </button>
          {dropdownOpen && (
            <div
              className="absolute left-0 top-full mt-1.5 bg-white rounded-xl border border-gray-100 shadow-lg z-50 overflow-hidden"
              style={{ minWidth: '220px' }}
            >
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-4 pt-3 pb-1">Quick ranges</p>
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  onClick={() => { setDateMode('preset'); setSelectedDays(opt.days); setDropdownOpen(false); }}
                  className={'w-full text-left px-4 py-2.5 text-[12px] font-medium transition-colors ' +
                    (dateMode === 'preset' && selectedDays === opt.days ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50')}
                >
                  {opt.label}
                </button>
              ))}
              <div className="border-t border-gray-100 px-4 py-2.5">
                <label className="text-[10px] font-semibold text-gray-400 block mb-1.5">Custom (days)</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    placeholder="e.g. 4"
                    value={customDaysInput}
                    onChange={(e) => setCustomDaysInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCustomDaysApply(); }}
                    className="w-full bg-gray-100 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-700 outline-none focus:ring-2 focus:ring-purple-200 min-w-0"
                  />
                  <button
                    onClick={handleCustomDaysApply}
                    className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold px-3 rounded-lg transition-colors"
                  >
                    Go
                  </button>
                </div>
              </div>
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-2">Custom date range</label>
                {rangeError && <p className="text-[10px] text-red-500 mb-1.5">{rangeError}</p>}
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] text-gray-400 block mb-0.5">From</span>
                    <input
                      type="date"
                      value={rangeStart}
                      max={rangeEnd || today}
                      onChange={(e) => { setRangeStart(e.target.value); setRangeError(''); }}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] text-gray-700 outline-none focus:ring-2 focus:ring-purple-200 min-w-0"
                    />
                  </div>
                  <span className="text-gray-300 text-xs mt-3">{'\u2192'}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] text-gray-400 block mb-0.5">To</span>
                    <input
                      type="date"
                      value={rangeEnd}
                      min={rangeStart}
                      max={today}
                      onChange={(e) => { setRangeEnd(e.target.value); setRangeError(''); }}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] text-gray-700 outline-none focus:ring-2 focus:ring-purple-200 min-w-0"
                    />
                  </div>
                </div>
                <button
                  onClick={handleRangeApply}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold py-2 rounded-lg transition-colors"
                >
                  Apply Range
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={fetching ? 'opacity-50 pointer-events-none transition-opacity duration-150' : 'transition-opacity duration-150'}>

        {/* Summary strip -- headline numbers before the detailed funnel/chart below */}
        <div id="tour-analytics-summary" className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
          <div className="grid grid-cols-4 divide-x divide-gray-100">
            <div className="px-3 md:px-4 py-3">
              <p className="text-[10px] text-gray-400 mb-1 leading-none">Requests Sent</p>
              <p className="text-base md:text-lg font-bold text-gray-900 tabular-nums leading-none">{total}</p>
            </div>
            <div className="px-3 md:px-4 py-3">
              <p className="text-[10px] text-gray-400 mb-1 leading-none">Reviews Collected</p>
              <p className="text-base md:text-lg font-bold text-gray-900 tabular-nums leading-none">{summary?.total_reviews ?? 0}</p>
            </div>
            <div className="px-3 md:px-4 py-3">
              <p className="text-[10px] text-gray-400 mb-1 leading-none">Google Reviews</p>
              <div className="flex items-baseline gap-1">
                <p className="text-base md:text-lg font-bold text-gray-900 tabular-nums leading-none">{summary?.total_public ?? 0}</p>
                <p className="text-[10px] text-gray-400">{calcPct(summary?.total_public) + '%'}</p>
              </div>
            </div>
            <div className="px-3 md:px-4 py-3">
              <p className="text-[10px] text-gray-400 mb-1 leading-none">Average Rating</p>
              <div className="flex items-baseline gap-1">
                <p className="text-base md:text-lg font-bold text-gray-900 tabular-nums leading-none">
                  {summary?.avg_rating ? summary.avg_rating.toFixed(1) : '\u2014'}
                </p>
                <span style={{ color: '#FBBF24', fontSize: '13px' }}>{'\u2605'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Funnel + Chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Review Funnel */}
          <div id="tour-analytics-funnel" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-bold text-gray-800">Review Funnel</h2>
              <Link href="/dashboard/reviews" className="text-[11px] font-semibold text-purple-600 hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-3.5">
              {funnelRows.map((row) => (
                <FunnelRow
                  key={row.label}
                  icon={row.icon}
                  isGoogle={row.isGoogle}
                  label={row.label}
                  value={row.value}
                  pct={row.pct}
                  color={row.color}
                />
              ))}
            </div>
            {totalPrivate > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Private Feedback Status</h3>
                  <Link href="/dashboard/feedback" className="text-[11px] font-semibold text-purple-600 hover:underline">
                    View all
                  </Link>
                </div>
                <div className="space-y-3.5">
                  {feedbackStatusRows.map((row) => (
                    <FunnelRow
                      key={row.label}
                      icon={row.icon}
                      isGoogle={row.isGoogle}
                      label={row.label}
                      value={row.value}
                      pct={row.pct}
                      color={row.color}
                    />
                  ))}
                </div>
              </div>
            )}
            {(summary?.total_private ?? 0) > 0 && (summary?.total_public ?? 0) === 0 && (
              <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t border-gray-50">
                {summary.total_private + ' review' + (summary.total_private === 1 ? '' : 's') + ' went to private feedback instead of Google \u2014 nothing\'s broken, that\'s expected for low ratings.'}
              </p>
            )}
          </div>

          {/* Reviews Over Time */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-bold text-gray-800">Reviews Over Time</h2>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[10px] text-gray-400">
                  <span style={{ display: 'inline-block', width: '14px', height: '2.5px', backgroundColor: '#22C55E', borderRadius: '9999px' }} />
                  Google
                </span>
                <span className="flex items-center gap-1 text-[10px] text-gray-400">
                  <span style={{ display: 'inline-block', width: '14px', height: '2.5px', backgroundColor: '#EF4444', borderRadius: '9999px' }} />
                  Private
                </span>
              </div>
            </div>
            {!mounted ? (
              <div className="h-44 bg-gray-50 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={chartData} margin={{ top: 5, right: 8, bottom: 5, left: -22 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: '#9CA3AF' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatChartDate}
                    interval={chartInterval}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: '#9CA3AF' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '6px 10px' }}
                    labelFormatter={formatChartDate}
                  />
                  <Line type="monotone" dataKey="google" stroke="#22C55E" strokeWidth={2.5} dot={{ r: 3.5, fill: '#22C55E', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Google" />
                  <Line type="monotone" dataKey="pvt"    stroke="#EF4444" strokeWidth={2.5} dot={{ r: 3.5, fill: '#EF4444', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Private" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(DashboardPage);