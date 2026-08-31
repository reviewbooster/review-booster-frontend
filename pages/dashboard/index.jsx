/**
 * pages/dashboard/index.jsx
 * Dashboard — Phase 2 redesign, mobile + desktop responsive.
 * Session 17 — trend indicators (% vs last month), View All colour fix.
 * Session 18 fix — date filter dropdown (7d / 30d / 3m), rolling period stats + chart.
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
import { useAuth } from '../../context/AuthContext';

const PERIOD_OPTIONS = [
  { days: 7,  label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 3 months' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDateRangeLabel(days) {
  const end   = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return fmt(start) + '\u00a0\u2013\u00a0' + fmt(end) + ', ' + end.getFullYear();
}

function getTrendSuffix(days) {
  if (days === 7)  return 'vs prev 7 days';
  if (days === 90) return 'vs prev 3 months';
  return 'vs prev 30 days';
}

function formatChartDate(v) {
  if (!v) return '';
  const d = new Date(v);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function calcTrend(current, previous) {
  if (!previous) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct: Math.abs(pct), up: pct >= 0 };
}

/* --- Mini stat card -------------------------------------------------------- */
function MiniCard({ icon, iconBg, label, value, trend, trendSuffix }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex flex-col justify-between flex-1 min-h-0">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold text-gray-400 leading-none">{label}</p>
        <div className={'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs ' + iconBg}>
          {icon}
        </div>
      </div>
      <p className="text-[22px] font-bold text-gray-900 leading-none tabular-nums text-center">{value}</p>
      {trend != null ? (
        <p className={'text-[10px] font-semibold leading-none text-center ' + (trend.up ? 'text-emerald-500' : 'text-red-400')}>
          {(trend.up ? '\u2191 +' : '\u2193 -') + trend.pct + '%'}
          <span className="hidden md:inline">{'\u00a0' + trendSuffix}</span>
        </p>
      ) : (
        <p className="text-[10px] text-gray-300 leading-none text-center">No data</p>
      )}
    </div>
  );
}

/* --- Average Rating card (purple gradient) --------------------------------- */
function AvgCard({ summary, mtd, mobile }) {
  const cardStyle = { background: 'linear-gradient(145deg,#7C3AED 0%,#4F46E5 100%)' };
  if (mobile) cardStyle.height = '215px';
  const avg     = summary && summary.avg_rating ? summary.avg_rating.toFixed(1) : '\u2014';
  const rounded = Math.round(summary && summary.avg_rating ? summary.avg_rating : 0);
  const delta   = mtd ? mtd.total_reviews : 0;
  return (
    <div className="rounded-2xl p-4 text-white flex flex-col justify-between" style={cardStyle}>
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span style={{ fontSize: '11px', fontWeight: 500, opacity: 0.85 }}>Average Rating</span>
          <span style={{ fontSize: '15px' }}>{'\u2B50'}</span>
        </div>
        <p className="font-extrabold leading-none mb-2" style={{ fontSize: '3rem', letterSpacing: '-2px' }}>
          {avg}
        </p>
        <div className="flex gap-1 mb-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <span
              key={s}
              style={{ fontSize: '17px', lineHeight: 1, color: s <= rounded ? '#FCD34D' : 'rgba(255,255,255,0.22)' }}
            >
              {'\u2605'}
            </span>
          ))}
        </div>
      </div>
      <p style={{ fontSize: '11px', opacity: 0.65 }}>
        {delta > 0 ? '\u2191 ' + delta + ' this period' : 'No reviews this period'}
      </p>
    </div>
  );
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
        <div className="h-7 w-48 bg-gray-200 rounded-xl animate-pulse mb-1.5" />
        <div className="h-4 w-60 bg-gray-100 rounded-lg animate-pulse mb-3" />
        <div className="h-7 w-36 bg-gray-100 rounded-xl animate-pulse" />
      </div>
      <div className="md:hidden grid grid-cols-2 gap-2.5 mb-5">
        <div className="bg-gray-200 rounded-2xl animate-pulse" style={{ height: '215px' }} />
        <div className="flex flex-col gap-2 h-[215px]">
          <div className="bg-gray-100 rounded-2xl animate-pulse flex-1" />
          <div className="bg-gray-100 rounded-2xl animate-pulse flex-1" />
          <div className="bg-gray-100 rounded-2xl animate-pulse flex-1" />
        </div>
      </div>
      <div className="hidden md:grid md:grid-cols-4 gap-4 mb-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={'h-36 rounded-2xl animate-pulse ' + (i === 1 ? 'bg-gray-200' : 'bg-gray-100')} />
        ))}
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
  const { user }                          = useAuth();
  const [selectedDays,  setSelectedDays]  = useState(30);
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [summary,       setSummary]       = useState(null);
  const [chartData,     setChartData]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [fetching,      setFetching]      = useState(false);
  const [mounted,       setMounted]       = useState(false);
  const [error,         setError]         = useState('');
  const dropdownRef  = useRef(null);
  const firstLoadRef = useRef(true);

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

  // Fetch data — re-runs when selectedDays changes
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
        const [sumRes, chartRes] = await Promise.all([
          api.get('/analytics/summary?days=' + selectedDays),
          api.get('/analytics/reviews-over-time?days=' + selectedDays),
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
  }, [selectedDays]);

  if (loading) return <DashboardSkeleton />;

  const total       = summary?.total_requests_sent || 0;
  const calcPct     = (v) => total > 0 ? Math.round(((v || 0) / total) * 100) : 0;
  const mtd         = summary?.this_month ?? null;
  const lmtd        = summary?.last_month ?? null;
  const trendSuffix = getTrendSuffix(selectedDays);

  // X-axis tick interval: show ~6 labels regardless of period length
  const chartInterval = selectedDays <= 7 ? 0 : selectedDays <= 30 ? 4 : 13;

  const funnelRows = [
    { icon: '\u25B8', isGoogle: false, label: 'Requests Sent',    value: total,                          pct: 100,                               color: '#60A5FA' },
    { icon: '\u25CF', isGoogle: false, label: 'Requestees',       value: summary?.total_requestees ?? 0, pct: calcPct(summary?.total_requestees), color: '#818CF8' },
    { icon: '\u2192', isGoogle: false, label: 'Delivered',        value: summary?.total_delivered  ?? 0, pct: calcPct(summary?.total_delivered),  color: '#2DD4BF' },
    { icon: '\u25CB', isGoogle: false, label: 'Opened',           value: summary?.total_opened     ?? 0, pct: calcPct(summary?.total_opened),     color: '#FBBF24' },
    { icon: '\u2713', isGoogle: false, label: 'Submitted',        value: summary?.total_reviews    ?? 0, pct: calcPct(summary?.total_reviews),    color: '#34D399' },
    { icon: '',       isGoogle: true,  label: 'Posted to Google', value: summary?.total_public     ?? 0, pct: calcPct(summary?.total_public),     color: '#818CF8' },
  ];

  const miniCards = [
    {
      icon: '\uD83D\uDCCB', iconBg: 'bg-blue-50',
      label: 'Total Reviews',
      value: summary?.total_reviews ?? 0,
      trend: calcTrend(mtd?.total_reviews ?? 0, lmtd?.total_reviews),
      trendSuffix,
    },
    {
      icon: <span style={{ fontWeight: 800, color: '#4285F4', fontSize: '9px', lineHeight: 1 }}>G</span>,
      iconBg: 'bg-sky-50',
      label: 'Google Reviews',
      value: summary?.total_public ?? 0,
      trend: calcTrend(mtd?.total_public ?? 0, lmtd?.total_public),
      trendSuffix,
    },
    {
      icon: '\uD83D\uDEA9', iconBg: 'bg-red-50',
      label: 'Private Feedback',
      value: summary?.total_private ?? 0,
      trend: calcTrend(mtd?.total_private ?? 0, lmtd?.total_private),
      trendSuffix,
    },
  ];

  return (
    <DashboardLayout>
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mb-4 text-red-500 text-xs">
          <span>{'\u26A0\uFE0F'}</span>
          <span>{error}</span>
        </div>
      )}

      {/* Greeting + date filter */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900 leading-tight">
          {getGreeting() + ', ' + ((user?.name ?? '').split(' ')[0]) + '\u00a0\uD83D\uDC4B'}
        </h1>
        <p className="text-[13px] text-gray-400 mt-0.5 mb-3">
          {"Here\u2019s how your reviews are performing."}
        </p>

        {/* Period dropdown */}
        <div className="relative inline-block" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={'inline-flex items-center gap-1.5 bg-white border rounded-xl px-3 py-1.5 text-[11px] font-medium shadow-sm transition-colors ' +
              (dropdownOpen ? 'border-purple-400 text-purple-600' : 'border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600')}
          >
            {'\uD83D\uDCC5\u00a0' + getDateRangeLabel(selectedDays) + '\u00a0\u25BE'}
          </button>
          {dropdownOpen && (
            <div
              className="absolute left-0 top-full mt-1.5 bg-white rounded-xl border border-gray-100 shadow-lg z-50 overflow-hidden"
              style={{ minWidth: '156px' }}
            >
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  onClick={() => { setSelectedDays(opt.days); setDropdownOpen(false); }}
                  className={'w-full text-left px-4 py-2.5 text-[12px] font-medium transition-colors ' +
                    (selectedDays === opt.days ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Data sections — fade during period re-fetch */}
      <div className={fetching ? 'opacity-50 pointer-events-none transition-opacity duration-150' : 'transition-opacity duration-150'}>

        {/* Mobile: avg card + 3 mini cards */}
        <div className="md:hidden grid grid-cols-2 gap-2.5 mb-5">
          <AvgCard summary={summary} mtd={mtd} mobile />
          <div className="flex flex-col gap-2 h-[215px]">
            {miniCards.map((c) => <MiniCard key={c.label} {...c} />)}
          </div>
        </div>

        {/* Desktop: flat 4-col row */}
        <div className="hidden md:grid md:grid-cols-4 gap-4 mb-5">
          <AvgCard summary={summary} mtd={mtd} />
          {miniCards.map((c) => <MiniCard key={c.label} {...c} />)}
        </div>

        {/* Funnel + Chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Review Funnel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
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