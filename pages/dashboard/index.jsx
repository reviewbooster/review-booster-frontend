/**
 * pages/dashboard/index.jsx
 * Dashboard -- Phase 2 redesign, mobile + desktop responsive.
 * Session 17 -- trend indicators (% vs last month), View All colour fix.
 * Session 18 fix -- date filter dropdown (7d / 30d / 3m), rolling period stats + chart.
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import GettingStartedChecklist from '../../components/GettingStartedChecklist';

const PERIOD_OPTIONS = [
  { days: 1,  label: 'Today' },
  { days: 7,  label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 3 months' },
  { days: 3650, label: 'Till now' },
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

function calcTrend(current, previous) {
  if (!previous) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct: Math.abs(pct), up: pct >= 0 };
}

/* --- Mini stat card -------------------------------------------------------- */
function MiniCard({ icon, iconBg, label, value, trend, trendSuffix, isTrialCard }) {
  return (
    <div className={'bg-white rounded-2xl border shadow-sm p-2 flex flex-col justify-between flex-1 min-h-0 overflow-hidden ' +
      (isTrialCard ? 'border-purple-200' : 'border-gray-100')}>
      <div className="flex items-start justify-between gap-1">
        <p className="text-[10px] font-semibold text-gray-400 leading-tight truncate">{label}</p>
        <div className={'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs ' + iconBg}>
          {icon}
        </div>
      </div>
      <p className="text-[22px] font-bold text-gray-900 leading-none tabular-nums text-center">{value}</p>
      {isTrialCard ? (
        <Link href="/dashboard/settings/billing" className="text-[10px] font-semibold leading-none text-center text-purple-600 hover:text-purple-700">
          {'Upgrade plan \u2192'}
        </Link>
      ) : trend != null ? (
        <p className={'text-[10px] font-semibold leading-none text-center ' + (trend.up ? 'text-emerald-500' : 'text-red-400')}>
          {(trend.up ? '\u2191 +' : '\u2193 -') + trend.pct + '%'}
          <span className="hidden md:inline">{'\u00a0' + trendSuffix}</span>
        </p>
      ) : (
        <p className="text-[10px] text-gray-300 leading-none text-center">Just getting started</p>
      )}
    </div>
  );
}

/* --- Average Rating card (color reflects actual rating health) ------------- */
function AvgCard({ summary, mtd, mobile }) {
  const rawAvg = summary && summary.avg_rating ? summary.avg_rating : 0;
  const hasData = !!(summary && summary.avg_rating);
  const reviewCount = (summary && summary.total_reviews) ? summary.total_reviews : 0;
  const MIN_SAMPLE = 5;
  const notEnoughData = hasData && reviewCount < MIN_SAMPLE;
  const avg     = hasData ? rawAvg.toFixed(1) : '\u2014';
  const rounded = Math.round(rawAvg);
  const delta   = mtd ? mtd.total_reviews : 0;

  const gradient = (!hasData || notEnoughData)
    ? 'linear-gradient(145deg,#7C3AED 0%,#4F46E5 100%)'
    : rawAvg >= 4
      ? 'linear-gradient(145deg,#059669 0%,#047857 100%)'
      : rawAvg >= 3
        ? 'linear-gradient(145deg,#D97706 0%,#B45309 100%)'
        : 'linear-gradient(145deg,#DC2626 0%,#B91C1C 100%)';

  const cardStyle = { background: gradient };
  if (mobile) cardStyle.height = '250px';

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
      {notEnoughData && (
        <p style={{ fontSize: '11px', fontWeight: 600, opacity: 0.9 }}>
          {'Not enough data yet \u2014 ' + reviewCount + ' of ' + MIN_SAMPLE + ' reviews needed'}
        </p>
      )}
      {!notEnoughData && hasData && rawAvg < 3 && (
        <p style={{ fontSize: '11px', fontWeight: 700, opacity: 0.95 }}>
          {'\u26A0\uFE0F Needs attention \u2014 check your Feedback tab'}
        </p>
      )}
      <p style={{ fontSize: '11px', opacity: 0.65 }}>
        {delta > 0 ? '\u2191 ' + delta + ' this period' : 'No reviews this period'}
      </p>
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
        <div className="flex flex-col gap-2 h-[250px]">
          <div className="bg-gray-100 rounded-2xl animate-pulse flex-1" />
          <div className="bg-gray-100 rounded-2xl animate-pulse flex-1" />
        </div>
      </div>
      <div className="hidden md:grid md:grid-cols-3 gap-4 mb-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className={'h-36 rounded-2xl animate-pulse ' + (i === 1 ? 'bg-gray-200' : 'bg-gray-100')} />
        ))}
      </div>
      <div className="h-14 bg-gray-100 rounded-2xl animate-pulse mb-5" />
      <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
    </DashboardLayout>
  );
}

/* --- Main page ------------------------------------------------------------- */
function DashboardPage() {
  const { user }                          = useAuth();
  const [selectedDays,  setSelectedDays]  = useState(function() {
    if (typeof window === 'undefined') return 30;
    var saved = parseInt(localStorage.getItem('rb_dashboard_days'), 10);
    return Number.isFinite(saved) && saved >= 1 ? saved : 30;
  });
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [customDaysInput, setCustomDaysInput] = useState('');
  const [dateMode,      setDateMode]      = useState(function() {
    if (typeof window === 'undefined') return 'preset';
    return localStorage.getItem('rb_dashboard_date_mode') === 'range' ? 'range' : 'preset';
  }); // 'preset' | 'range'
  const [rangeStart,    setRangeStart]    = useState(function() {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('rb_dashboard_range_start') || '';
  });
  const [rangeEnd,      setRangeEnd]      = useState(function() {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('rb_dashboard_range_end') || '';
  });
  const [rangeError,    setRangeError]    = useState('');
  const [summary,       setSummary]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [fetching,      setFetching]      = useState(false);
  const [error,         setError]         = useState('');
  const [needsGoogleUrl, setNeedsGoogleUrl] = useState(false);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [businessPlan, setBusinessPlan] = useState(null);
  const [trialEndsAt, setTrialEndsAt] = useState(null);
  const [googleBannerDismissed, setGoogleBannerDismissed] = useState(false);
  const [referralTotal, setReferralTotal] = useState(0);
  const dropdownRef  = useRef(null);
  const firstLoadRef = useRef(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('rb_dismiss_google_banner') === '1') {
      setGoogleBannerDismissed(true);
    }
  }, []);

  // Total verified referrals -- quiet, all-time count for the summary card below.
  useEffect(() => {
    if (user?.role === 'super_admin') return;
    api.get('/referrals/stats')
      .then((res) => setReferralTotal(res.data?.data?.total_redeemed ?? 0))
      .catch(() => { /* silent */ });
  }, [user]);

  // Prompt owners to set their Google Review URL if it's still missing --
  // without it, 4-5 star reviews have nowhere to redirect to.
  useEffect(() => {
    if (user?.role === 'super_admin') return;
    api.get('/business/my-settings')
      .then((res) => {
        const url = res.data?.data?.google_review_url;
        setNeedsGoogleUrl(!url);
        setBusinessPlan(res.data?.data?.plan ?? null);
        setTrialEndsAt(res.data?.data?.trial_ends_at ?? null);
        const createdAt = res.data?.data?.created_at;
        if (createdAt && !localStorage.getItem('rb_dashboard_days')) {
          const ageDays = (Date.now() - new Date(createdAt)) / (1000 * 60 * 60 * 24);
          if (ageDays < 14) setSelectedDays(7);
        }
      })
      .catch(() => { /* silent -- non-critical prompt */ });
  }, [user]);

  // Unresolved private-feedback count, for the dashboard badge/callout.
  useEffect(() => {
    if (user?.role === 'super_admin') return;
    api.get('/reviews/private?page=1&limit=1')
      .then((res) => setUnresolvedCount(res.data?.totalUnresolved ?? 0))
      .catch(() => { /* silent */ });
  }, [user]);

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

    // Remember the chosen range so a refresh doesn't reset it back to default.
    localStorage.setItem('rb_dashboard_date_mode', dateMode);
    localStorage.setItem('rb_dashboard_days', String(selectedDays));
    localStorage.setItem('rb_dashboard_range_start', rangeStart || '');
    localStorage.setItem('rb_dashboard_range_end', rangeEnd || '');

    const load = async () => {
      try {
        const query = dateMode === 'range' && rangeStart && rangeEnd
          ? 'start_date=' + rangeStart + '&end_date=' + rangeEnd
          : 'days=' + selectedDays;
        const sumRes = await api.get('/analytics/summary?' + query);
        setSummary(sumRes.data.data);
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

  const mtd         = summary?.this_month ?? null;
  const lmtd        = summary?.last_month ?? null;
  const trendSuffix = dateMode === 'range' ? 'vs previous period' : getTrendSuffix(selectedDays);

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

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
  ];

  return (
    <DashboardLayout>
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mb-4 text-red-500 text-xs">
          <span>{'\u26A0\uFE0F'}</span>
          <span>{error}</span>
        </div>
      )}

      {needsGoogleUrl && !googleBannerDismissed && (
        <div className="flex items-center gap-2.5 bg-purple-50 border border-purple-200 rounded-xl px-3.5 py-2.5 mb-4">
          <span className="text-base shrink-0">{'\u26A0\uFE0F'}</span>
          <p className="flex-1 min-w-0 text-xs font-medium text-purple-700 truncate">
            {'Add your Google Review link to enable redirects'}
          </p>
          <Link
            href="/dashboard/settings/business-profile"
            className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            Set it up
          </Link>
          <button
            onClick={() => {
              setGoogleBannerDismissed(true);
              if (typeof window !== 'undefined') sessionStorage.setItem('rb_dismiss_google_banner', '1');
            }}
            className="shrink-0 text-purple-400 hover:text-purple-600 p-1"
            aria-label="Dismiss"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {unresolvedCount > 0 && (
        <Link
          href="/dashboard/feedback"
          className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 hover:bg-red-100 transition-colors"
        >
          <span className="shrink-0 bg-red-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1.5">
            {unresolvedCount > 99 ? '99+' : unresolvedCount}
          </span>
          <p className="text-sm font-semibold text-red-600 flex-1">
            {unresolvedCount === 1 ? '1 piece of feedback needs your attention' : unresolvedCount + ' pieces of feedback need your attention'}
          </p>
          <span className="text-red-400 text-xs font-semibold shrink-0">View {'\u2192'}</span>
        </Link>
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
        {businessPlan === 'trial' && trialDaysLeft !== null && (
          <p className="text-[11px] text-purple-600 font-medium mt-2.5">
            {'Trial ends in ' + trialDaysLeft + ' day' + (trialDaysLeft === 1 ? '' : 's') + ' \u00b7 '}
            <Link href="/dashboard/settings/billing" className="underline hover:text-purple-700">Upgrade plan</Link>
          </p>
        )}
      </div>

        <GettingStartedChecklist hasGoogleLink={!needsGoogleUrl} hasSentRequest={(summary?.total_requests_sent || 0) > 0} />
      {/* Data sections -- fade during period re-fetch */}
      <div className={fetching ? 'opacity-50 pointer-events-none transition-opacity duration-150' : 'transition-opacity duration-150'}>

        {/* Mobile: avg card + 2 mini cards */}
        <div className="md:hidden grid grid-cols-2 gap-2.5 mb-5">
          <AvgCard summary={summary} mtd={mtd} mobile />
          <div className="flex flex-col gap-2 h-[250px]">
            {miniCards.map((c) => <MiniCard key={c.label} {...c} />)}
          </div>
        </div>

        {/* Desktop: flat 3-col row */}
        <div className="hidden md:grid md:grid-cols-3 gap-4 mb-5">
          <AvgCard summary={summary} mtd={mtd} />
          {miniCards.map((c) => <MiniCard key={c.label} {...c} />)}
        </div>

        {/* Primary action -- the one thing an owner needs to do fast, in
            front of a customer, every single time. */}
        <Link
          href="/dashboard/send-request"
          className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm py-3.5 rounded-2xl mb-5 transition-colors shadow-sm"
        >
          <span>{'\u2B50'}</span>
          Send Review Request
        </Link>

        {/* Referral program -- total verified referrals, all-time */}
        <Link
          href="/dashboard/referrals"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:border-purple-200 transition-colors"
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#F3E8FF' }}>
            <svg width="20" height="20" fill="none" stroke="#7C3AED" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 4v-2a4 4 0 00-3-3.87M9 12a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 leading-none">{referralTotal}</p>
            <p className="text-xs text-gray-400 mt-1">
              {'Customer' + (referralTotal === 1 ? '' : 's') + ' referred by your reviewers'}
            </p>
          </div>
          <span className="ml-auto text-[11px] font-semibold text-purple-600 shrink-0">View Referrals {'\u2192'}</span>
        </Link>

        {/* Quick Actions -- one card, a few compact rows, not a card each */}
        <p className="text-sm font-bold text-gray-800 mt-5 mb-2">Quick Actions</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          <Link href="/dashboard/reviews" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors">
            <svg width="18" height="18" fill="none" stroke="#9CA3AF" strokeWidth="1.8" viewBox="0 0 24 24" className="shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">View Reviews</p>
              <p className="text-[11px] text-gray-400">See customer feedback</p>
            </div>
            <span className="text-gray-300 shrink-0">{'\u2192'}</span>
          </Link>
          <Link href="/dashboard/feedback" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors">
            <svg width="18" height="18" fill="none" stroke="#9CA3AF" strokeWidth="1.8" viewBox="0 0 24 24" className="shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <path d="M4 22v-7" strokeLinecap="round" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">Check Private Feedback</p>
              <p className="text-[11px] text-gray-400">
                {unresolvedCount > 0 ? unresolvedCount + ' need attention' : 'All caught up'}
              </p>
            </div>
            {unresolvedCount > 0 && (
              <span className="shrink-0 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {unresolvedCount > 99 ? '99+' : unresolvedCount}
              </span>
            )}
          </Link>
          <Link href="/dashboard/analytics" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors">
            <svg width="18" height="18" fill="none" stroke="#9CA3AF" strokeWidth="1.8" viewBox="0 0 24 24" className="shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8" />
              <path d="M15 7h6v6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">View Analytics</p>
              <p className="text-[11px] text-gray-400">Track your growth</p>
            </div>
            <span className="text-gray-300 shrink-0">{'\u2192'}</span>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(DashboardPage);