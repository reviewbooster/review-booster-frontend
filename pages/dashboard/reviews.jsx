/**
 * pages/dashboard/reviews.jsx
 * Reviews page â€” Phase 2 redesign.
 * Later fix â€” the date filter used to be decorative only (always showed "last 7
 * days" but never actually filtered anything). It's now a real calendar-based
 * range picker, the sort button (search bar icon) actually works, header stats
 * respect all active filters, and channel filtering no longer breaks pagination.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';
import AiReplyModal from '../../components/AiReplyModal';
import { useAuth } from '../../context/AuthContext';

const AVATAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#0EA5E9'];
function avatarBg(idx) { return AVATAR_COLORS[idx % AVATAR_COLORS.length]; }

const PERIOD_OPTIONS = [
  { days: null, label: 'All time' },
  { days: 7,    label: 'Last 7 days' },
  { days: 30,   label: 'Last 30 days' },
  { days: 90,   label: 'Last 3 months' },
];

const SORT_OPTIONS = [
  { key: 'newest',      label: 'Newest first' },
  { key: 'oldest',      label: 'Oldest first' },
  { key: 'rating_high', label: 'Highest rating' },
  { key: 'rating_low',  label: 'Lowest rating' },
];

function fmtDate(d) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysToRange(days) {
  var end = new Date();
  var start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function getPresetLabel(days) {
  if (days == null) return 'All time';
  var r = daysToRange(days);
  var fmt = function(s) { return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
  return fmt(r.start) + '\u00a0\u2013\u00a0' + fmt(r.end) + ', ' + new Date().getFullYear();
}

function StarRow({ rating }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map(function(s) {
        return (
          <span key={s} style={{ color: s <= (rating || 0) ? '#FBBF24' : '#E5E7EB', fontSize: '13px' }}>
            {'\u2605'}
          </span>
        );
      })}
    </span>
  );
}

function buildPages(page, total) {
  if (total <= 6) return Array.from({ length: total }, function(_, i) { return i + 1; });
  if (page <= 3)       return [1, 2, 3, '_d1', total];
  if (page >= total-2) return [1, '_d1', total-2, total-1, total];
  return [1, '_d1', page-1, page, page+1, '_d2', total];
}

function channelLabel(ch) {
  if (!ch) return null;
  if (ch === 'whatsapp') return 'WhatsApp';
  if (ch === 'sms')      return 'SMS';
  if (ch === 'email')    return 'Email';
  if (ch === 'qr')       return 'QR Code';
  return ch;
}

function ReviewDetailModal({ review, idx, onClose, onAiReply, isStaff, onThankAndRefer, referringId }) {
  if (!review) return null;
  var cust = review.customer_id || {};
  var name = cust.name || 'Anonymous';
  var ch   = channelLabel(review.channel);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
        onClick={function(e) { e.stopPropagation(); }}>

        <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900">Review Details</p>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none">
            {'\u00D7'}
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">

          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0"
              style={{ backgroundColor: avatarBg(idx) }}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{name}</p>
              {cust.phone && (
                <p className="text-xs text-gray-400 mt-0.5">{cust.phone}</p>
              )}
              {cust.email && (
                <p className="text-xs text-gray-400">{cust.email}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={'text-[10px] font-semibold px-2.5 py-1 rounded-full ' +
              (review.is_public ? 'bg-blue-50 text-blue-500' : 'bg-red-50 text-red-400')}>
              {review.is_public ? 'Google' : 'Private'}
            </span>
            {ch && (
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                {ch}
              </span>
            )}
            <span className="text-[10px] text-gray-400 ml-auto">{fmtDate(review.created_at)}</span>
          </div>

          <div className="flex items-center gap-2">
            <StarRow rating={review.rating} />
            <span className="text-xs text-gray-500 font-medium">
              {review.rating ? review.rating + ' / 5' : '\u2014'}
            </span>
          </div>

          {review.feedback_text ? (
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-600 leading-relaxed">{review.feedback_text}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No feedback text provided.</p>
          )}
        </div>

        {!isStaff && (
          <div className="px-5 pb-5 space-y-2">
            <button
              onClick={function() { onAiReply(review); onClose(); }}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl border border-purple-200 text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors">
              {'\u2736'} AI Reply
            </button>
            {cust.phone && (
              <button
                onClick={function() { onThankAndRefer(review); }}
                disabled={referringId === review._id}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl border border-green-200 text-green-600 bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50">
                {referringId === review._id ? '\u2026' : <>{'\uD83D\uDC65'} Thank + Refer on WhatsApp</>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewsPage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';
  const [reviews,        setReviews]        = useState([]);
  const [total,          setTotal]          = useState(0);
  const [page,           setPage]           = useState(1);
  const [search,         setSearch]         = useState('');
  const [filter,         setFilter]         = useState({ rating: '', channel: '' });
  const [sort,           setSort]           = useState('newest');
  const [sortMenuOpen,   setSortMenuOpen]   = useState(false);
  const [dateMode,       setDateMode]       = useState('preset'); // 'preset' | 'range'
  const [selectedDays,   setSelectedDays]   = useState(null);      // null = All time
  const [customDaysInput, setCustomDaysInput] = useState('');
  const [rangeStart,     setRangeStart]     = useState('');
  const [rangeEnd,       setRangeEnd]       = useState('');
  const [rangeError,     setRangeError]     = useState('');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [stats,          setStats]          = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [fetching,       setFetching]       = useState(false);
  const [error,          setError]          = useState('');
  const [selectedReview, setSelectedReview] = useState(null);
  const [selectedIdx,    setSelectedIdx]    = useState(0);
  const [aiReplyReview,  setAiReplyReview]  = useState(null);
  const [exportLoading,  setExportLoading]  = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [referringId,    setReferringId]    = useState(null);

  const dateDropdownRef = useRef(null);
  const sortMenuRef     = useRef(null);
  const firstLoadRef    = useRef(true);
  const LIMIT = 10;
  const today = new Date().toISOString().slice(0, 10);

  // Resolve the current date selection into {start_date, end_date} or null (all time)
  const getDateBounds = useCallback(function() {
    if (dateMode === 'range' && rangeStart && rangeEnd) {
      return { start_date: rangeStart, end_date: rangeEnd };
    }
    if (dateMode === 'preset' && selectedDays != null) {
      var r = daysToRange(selectedDays);
      return { start_date: r.start, end_date: r.end };
    }
    return null;
  }, [dateMode, selectedDays, rangeStart, rangeEnd]);

  const buildFilterParams = useCallback(function() {
    var params = new URLSearchParams();
    if (filter.rating)  params.set('rating', filter.rating);
    if (filter.channel) params.set('channel', filter.channel);
    if (search)         params.set('search', search);
    var bounds = getDateBounds();
    if (bounds) {
      params.set('start_date', bounds.start_date);
      params.set('end_date', bounds.end_date);
    }
    return params;
  }, [filter, search, getDateBounds]);

  // Close dropdowns on outside click
  useEffect(function() {
    function handler(e) {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target)) setDateDropdownOpen(false);
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) setSortMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return function() { document.removeEventListener('mousedown', handler); };
  }, []);

  // Stats strip â€” now respects rating/channel/date filters (previously always all-time)
  useEffect(function() {
    var params = buildFilterParams();
    if (!params.has('start_date')) params.set('days', '36500'); // effectively "all time" for the summary endpoint
    api.get('/analytics/summary?' + params.toString()).then(function(res) {
      setStats(res.data.data);
    }).catch(function() {});
  }, [filter, search, dateMode, selectedDays, rangeStart, rangeEnd, buildFilterParams]);

  const load = useCallback(async function() {
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      setLoading(true);
    } else {
      setFetching(true);
    }
    setError('');
    try {
      var params = buildFilterParams();
      params.set('page', page);
      params.set('limit', LIMIT);
      params.set('sort', sort);
      var res = await api.get('/reviews?' + params.toString());
      setReviews(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (e) {
      setError('Failed to load reviews.');
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [page, sort, buildFilterParams]);

  useEffect(function() { load(); }, [load]);

  var handleFilterChange = function(key, val) {
    setFilter(function(f) { return Object.assign({}, f, { [key]: val }); });
    setPage(1);
  };
  var handleSearch = function(val) { setSearch(val); setPage(1); };

  var handleClearAll = function() {
    setFilter({ rating: '', channel: '' });
    setSearch('');
    setSort('newest');
    setDateMode('preset');
    setSelectedDays(null);
    setRangeStart('');
    setRangeEnd('');
    setPage(1);
  };

  var handleCustomDaysApply = function() {
    var n = parseInt(customDaysInput, 10);
    if (n >= 1 && n <= 365) {
      setDateMode('preset');
      setSelectedDays(n);
      setDateDropdownOpen(false);
      setCustomDaysInput('');
      setPage(1);
    }
  };

  var handleRangeApply = function() {
    if (!rangeStart || !rangeEnd) { setRangeError('Pick both a start and end date.'); return; }
    if (rangeStart > rangeEnd)    { setRangeError('Start date must be before end date.'); return; }
    setRangeError('');
    setDateMode('range');
    setDateDropdownOpen(false);
    setPage(1);
  };

  var handleExport = async function(format) {
    setExportLoading(true);
    try {
      var params = buildFilterParams();
      params.set('format', format);
      var res = await api.get('/reviews/export?' + params.toString(), { responseType: 'blob' });
      var url = URL.createObjectURL(res.data);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'reviews-export.' + format;
      a.click();
      URL.revokeObjectURL(url);
    } catch (_) {}
    setExportLoading(false);
  };

  var handleThankAndRefer = async function(r) {
    if (!r.customer_id || !r.customer_id.phone || referringId) return;
    setReferringId(r._id);
    try {
      var res = await api.get('/referrals/customer/' + r.customer_id._id);
      var link = window.location.origin + '/ref/' + res.data.data.code;
      var msg = 'Hi ' + r.customer_id.name + ', thank you so much for the ' + r.rating + '-star rating! \uD83D\uDE4F' +
        '\n\n' +
        'If you know anyone who might enjoy our service, here\u2019s your personal referral link to share with them:' +
        '\n' + link;
      window.open('https://wa.me/' + r.customer_id.phone.replace(/^\+/, '') + '?text=' + encodeURIComponent(msg), '_blank');
    } catch (_) {}
    setReferringId(null);
  };

  var totalReviews = (stats && stats.total_reviews) ? stats.total_reviews : 0;
  var googleCount  = (stats && stats.total_public)  ? stats.total_public  : 0;
  var privateCount = (stats && stats.total_private) ? stats.total_private : 0;
  var avgRating    = (stats && stats.avg_rating)    ? stats.avg_rating    : 0;
  var googlePct    = totalReviews > 0 ? Math.round((googleCount  / totalReviews) * 100) : 0;
  var privatePct   = totalReviews > 0 ? Math.round((privateCount / totalReviews) * 100) : 0;

  var totalPages = Math.ceil(total / LIMIT);
  var hasActiveFilters = !!(filter.rating || filter.channel || search || dateMode === 'range' || (dateMode === 'preset' && selectedDays != null) || sort !== 'newest');

  var dateLabel = dateMode === 'range' && rangeStart && rangeEnd
    ? new Date(rangeStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + '\u00a0\u2013\u00a0' + new Date(rangeEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : getPresetLabel(selectedDays);

  return (
    <DashboardLayout>

      <ReviewDetailModal
        review={selectedReview}
        idx={selectedIdx}
        onClose={function() { setSelectedReview(null); }}
        onAiReply={function(r) { setAiReplyReview(r); }}
        isStaff={isStaff}
        onThankAndRefer={handleThankAndRefer}
        referringId={referringId} />

      <AiReplyModal
        review={aiReplyReview}
        onClose={function() { setAiReplyReview(null); }} />

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={filter.rating}
          onChange={function(e) { handleFilterChange('rating', e.target.value); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 font-medium outline-none focus:ring-2 focus:ring-purple-200 cursor-pointer">
          <option value="">All Ratings</option>
          {[5, 4, 3, 2, 1].map(function(r) {
            return <option key={r} value={r}>{r + ' Star' + (r !== 1 ? 's' : '')}</option>;
          })}
        </select>

        <select
          value={filter.channel}
          onChange={function(e) { handleFilterChange('channel', e.target.value); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 font-medium outline-none focus:ring-2 focus:ring-purple-200 cursor-pointer">
          <option value="">All Channels</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="sms">SMS</option>
          <option value="email">Email</option>
          <option value="qr">QR Code</option>
        </select>

        <div className="relative" ref={dateDropdownRef}>
          <button
            onClick={function() { setDateDropdownOpen(!dateDropdownOpen); }}
            className={'flex items-center gap-1.5 bg-white border rounded-xl px-3 py-2 text-[11px] font-medium transition-colors ' +
              (dateDropdownOpen ? 'border-purple-400 text-purple-600' : 'border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600')}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path strokeLinecap="round" d="M3 9h18M8 2v4M16 2v4" />
            </svg>
            {dateLabel}
          </button>
          {dateDropdownOpen && (
            <div
              className="absolute left-0 top-full mt-1.5 bg-white rounded-xl border border-gray-100 shadow-lg z-50 overflow-hidden"
              style={{ minWidth: '220px' }}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-4 pt-3 pb-1">Quick ranges</p>
              {PERIOD_OPTIONS.map(function(opt) {
                return (
                  <button
                    key={opt.label}
                    onClick={function() { setDateMode('preset'); setSelectedDays(opt.days); setDateDropdownOpen(false); setPage(1); }}
                    className={'w-full text-left px-4 py-2.5 text-[12px] font-medium transition-colors ' +
                      (dateMode === 'preset' && selectedDays === opt.days ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50')}>
                    {opt.label}
                  </button>
                );
              })}
              <div className="border-t border-gray-100 px-4 py-2.5">
                <label className="text-[10px] font-semibold text-gray-400 block mb-1.5">Custom (days)</label>
                <div className="flex gap-1.5">
                  <input
                    type="number" min={1} max={365} placeholder="e.g. 4"
                    value={customDaysInput}
                    onChange={function(e) { setCustomDaysInput(e.target.value); }}
                    onKeyDown={function(e) { if (e.key === 'Enter') handleCustomDaysApply(); }}
                    className="w-full bg-gray-100 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-700 outline-none focus:ring-2 focus:ring-purple-200 min-w-0" />
                  <button onClick={handleCustomDaysApply}
                    className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold px-3 rounded-lg transition-colors">
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
                    <input type="date" value={rangeStart} max={rangeEnd || today}
                      onChange={function(e) { setRangeStart(e.target.value); setRangeError(''); }}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] text-gray-700 outline-none focus:ring-2 focus:ring-purple-200 min-w-0" />
                  </div>
                  <span className="text-gray-300 text-xs mt-3">{'\u2192'}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] text-gray-400 block mb-0.5">To</span>
                    <input type="date" value={rangeEnd} min={rangeStart} max={today}
                      onChange={function(e) { setRangeEnd(e.target.value); setRangeError(''); }}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] text-gray-700 outline-none focus:ring-2 focus:ring-purple-200 min-w-0" />
                  </div>
                </div>
                <button onClick={handleRangeApply}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold py-2 rounded-lg transition-colors">
                  Apply Range
                </button>
              </div>
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-gray-600 px-2 py-2 transition-colors">
            {'\u2715'} Clear
          </button>
        )}
        <div className="relative ml-auto">
          <button
            onClick={function() { setExportMenuOpen(function(v) { return !v; }); }}
            disabled={exportLoading}
            className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-2 text-[11px] text-gray-600 font-medium hover:border-purple-300 hover:text-purple-600 transition-colors disabled:opacity-50">
            {exportLoading ? '\u2026' : '\u2B07 Export'}
          </button>
          {exportMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={function() { setExportMenuOpen(false); }} />
              <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-20">
                <button
                  onClick={function() { setExportMenuOpen(false); handleExport('csv'); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  CSV
                </button>
                <button
                  onClick={function() { setExportMenuOpen(false); handleExport('pdf'); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  PDF
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Search + sort */}
      <div className="relative mb-4" ref={sortMenuRef}>
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
        </span>
        <input
          className="w-full bg-gray-100 rounded-xl pl-10 pr-10 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-200 transition"
          placeholder="Search reviews..."
          value={search}
          onChange={function(e) { handleSearch(e.target.value); }} />
        <button
          type="button"
          onClick={function() { setSortMenuOpen(!sortMenuOpen); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 p-1 rounded-lg transition-colors">
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 9h10M11 14h2" />
          </svg>
        </button>
        {sortMenuOpen && (
          <div className="absolute right-0 top-full mt-2 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 w-44">
            {SORT_OPTIONS.map(function(opt) {
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={function() { setSort(opt.key); setSortMenuOpen(false); setPage(1); }}
                  className={'w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ' +
                    (sort === opt.key ? 'text-purple-600 font-semibold' : 'text-gray-600')}>
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Stats strip */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
        {!stats ? (
          <div className="grid grid-cols-4 divide-x divide-gray-100">
            {[0, 1, 2, 3].map(function(i) {
              return (
                <div key={i} className="px-4 py-3">
                  <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-14 mb-2" />
                  <div className="h-5 bg-gray-200 rounded-full animate-pulse w-10" />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-4 divide-x divide-gray-100">
            <div className="px-3 md:px-4 py-3">
              <p className="text-[10px] text-gray-400 mb-1 leading-none">Total Reviews</p>
              <p className="text-base md:text-lg font-bold text-gray-900 tabular-nums leading-none">{totalReviews}</p>
            </div>
            <div className="px-3 md:px-4 py-3">
              <p className="text-[10px] text-gray-400 mb-1 leading-none">Google Reviews</p>
              <div className="flex items-baseline gap-1">
                <p className="text-base md:text-lg font-bold text-gray-900 tabular-nums leading-none">{googleCount}</p>
                <p className="text-[10px] text-gray-400">{googlePct + '%'}</p>
              </div>
            </div>
            <div className="px-3 md:px-4 py-3">
              <p className="text-[10px] text-gray-400 mb-1 leading-none">Private Feedback</p>
              <div className="flex items-baseline gap-1">
                <p className="text-base md:text-lg font-bold text-gray-900 tabular-nums leading-none">{privateCount}</p>
                <p className="text-[10px] text-red-400">{privatePct + '%'}</p>
              </div>
            </div>
            <div className="px-3 md:px-4 py-3">
              <p className="text-[10px] text-gray-400 mb-1 leading-none">Average Rating</p>
              <div className="flex items-baseline gap-1">
                <p className="text-base md:text-lg font-bold text-gray-900 tabular-nums leading-none">
                  {avgRating ? avgRating.toFixed(1) : '\u2014'}
                </p>
                <span style={{ color: '#FBBF24', fontSize: '13px' }}>{'\u2605'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <div className="alert-error mb-4"><span>{'\u26A0'}</span><span>{error}</span></div>}

      {/* Reviews list */}
      <div className={'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4 transition-opacity duration-150 ' +
        (fetching ? 'opacity-50 pointer-events-none' : '')}>
        {loading ? (
          Array.from({ length: 5 }).map(function(_, i) {
            return (
              <div key={i} className="flex items-start gap-3 px-4 py-4 border-b border-gray-100 last:border-0">
                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="flex gap-2">
                    <div className="h-3.5 bg-gray-200 rounded-full animate-pulse w-24" />
                    <div className="h-4 bg-gray-100 rounded-full animate-pulse w-14" />
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full animate-pulse w-20" />
                  <div className="h-3 bg-gray-100 rounded-full animate-pulse w-48" />
                </div>
              </div>
            );
          })
        ) : reviews.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center px-6">
            <p className="text-4xl mb-3">{'\u2B50'}</p>
            <p className="text-sm font-semibold text-gray-700 mb-1">No reviews yet</p>
            <p className="text-xs text-gray-400">
              {hasActiveFilters ? 'Try adjusting your filters.' : 'Customer reviews will appear here once submitted.'}
            </p>
          </div>
        ) : (
          reviews.map(function(r, i) {
            return (
              <div key={r._id}
                className="flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors duration-100">

                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 mt-0.5"
                  style={{ backgroundColor: avatarBg((page-1)*LIMIT + i) }}>
                  {(r.customer_id && r.customer_id.name ? r.customer_id.name : 'A').charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {(r.customer_id && r.customer_id.name) ? r.customer_id.name : 'Anonymous'}
                    </p>
                    <span className={'text-[10px] font-semibold px-2 py-0.5 rounded-full ' +
                      (r.is_public ? 'bg-blue-50 text-blue-500' : 'bg-red-50 text-red-400')}>
                      {r.is_public ? 'Google' : 'Private'}
                    </span>
                    <span className="text-[10px] text-gray-400 ml-auto shrink-0">{fmtDate(r.created_at)}</span>
                  </div>
                  <StarRow rating={r.rating} />
                  {r.feedback_text && (
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed"
                      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {r.feedback_text}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  {!isStaff && (
                    <button
                      onClick={function() { setAiReplyReview(r); }}
                      className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold rounded-lg border border-purple-200 text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors">
                      {'\u2736'} AI Reply
                    </button>
                  )}
                  {!isStaff && r.customer_id && r.customer_id.phone && (
                    <button
                      onClick={function() { handleThankAndRefer(r); }}
                      disabled={referringId === r._id}
                      title="Send a thank-you + their referral link on WhatsApp"
                      className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold rounded-lg border border-green-200 text-green-600 bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50">
                      {referringId === r._id ? '\u2026' : <>{'\uD83D\uDC65'} Thank + Refer</>}
                    </button>
                  )}
                  <button
                    onClick={function() { setSelectedReview(r); setSelectedIdx((page-1)*LIMIT + i); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold rounded-lg border border-purple-200 text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors">
                    View Details
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400 order-2 sm:order-1">
            {'Showing ' + ((page-1)*LIMIT+1) + ' to ' + Math.min(page*LIMIT, total) + ' of ' + total.toLocaleString()}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-0.5 order-1 sm:order-2">
              <button onClick={function() { setPage(function(p) { return p-1; }); }} disabled={page===1}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                {'\u2039'}
              </button>
              {buildPages(page, totalPages).map(function(p) {
                return p === '_d1' || p === '_d2' ? (
                  <span key={p} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">{'\u2026'}</span>
                ) : (
                  <button key={p} onClick={function() { setPage(p); }}
                    className={'w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors ' +
                      (p === page ? 'text-white' : 'text-gray-500 hover:bg-gray-100')}
                    style={p === page ? { backgroundColor: '#7C3AED' } : {}}>
                    {p}
                  </button>
                );
              })}
              <button onClick={function() { setPage(function(p) { return p+1; }); }} disabled={page===totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                {'\u203A'}
              </button>
            </div>
          )}
        </div>
      )}

    </DashboardLayout>
  );
}

export default withAuth(ReviewsPage);
