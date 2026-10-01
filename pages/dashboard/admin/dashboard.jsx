/**
 * pages/dashboard/admin/dashboard.jsx
 * Super Admin — the operating overview. 4 real KPI cards + a Needs
 * Attention feed built from real queries (expiring plans, unresolved
 * feedback, pending Engine B credits). No invented revenue — manual UPI
 * billing has no payment-history model, so subscription counts by plan
 * are shown instead, per the doc's own rule against fake numbers.
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import DashboardLayout from '../../../components/DashboardLayout';
import withAuth from '../../../components/withAuth';
import api from '../../../lib/api';

function fmtDate(d) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function KpiCard({ icon, iconBg, value, label, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className={'w-9 h-9 rounded-xl flex items-center justify-center mb-3 text-base ' + iconBg}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-xs text-gray-500 mt-1.5 font-medium">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function fmtRelative(d) {
  var days = Math.floor((Date.now() - new Date(d).getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return days + ' days ago';
}

function fmtWeek(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function GrowthTrendChart({ data }) {
  if (!data || data.length === 0) return null;
  var chartData = data.map(function(b) { return { label: fmtWeek(b.week_start), count: b.count, week_start: b.week_start }; });
  var total = data.reduce(function(s, b) { return s + b.count; }, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">New Businesses</p>
        <p className="text-xs text-gray-400">{'+' + total + ' in the last ' + data.length + ' weeks'}</p>
      </div>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={28} />
            <Tooltip formatter={function(v) { return [v, 'New businesses']; }} labelFormatter={function(l) { return 'Week of ' + l; }} />
            <Bar dataKey="count" fill="#7C3AED" radius={[6, 6, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function NeedsAttentionSection({ data }) {
  if (!data) return null;
  var expiring = data.expiring || [];
  var unresolved = data.unresolved_feedback || [];
  var credits = data.pending_credits || [];
  var total = expiring.length + unresolved.length + credits.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Needs Attention</p>
        {total === 0 && <span className="text-xs font-semibold text-green-600">All caught up</span>}
      </div>

      {total === 0 ? (
        <p className="text-xs text-gray-400">Nothing needs your attention right now.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {expiring.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-500 mb-2">{'Plans expiring soon (' + expiring.length + ')'}</p>
              <ul className="space-y-2">
                {expiring.map(function(e) {
                  var urgent = e.days_left <= 3;
                  return (
                    <li key={e.business_id}>
                      <Link href={'/dashboard/admin/businesses/' + e.business_id} className="flex items-center justify-between gap-2 hover:bg-gray-50 rounded-lg px-2 py-1.5 -mx-2">
                        <span className="text-xs text-gray-700 truncate">{e.business_name}</span>
                        <span className={'text-[11px] font-semibold shrink-0 ' + (urgent ? 'text-red-500' : 'text-amber-500')}>
                          {e.days_left >= 0 ? e.days_left + 'd left' : 'expired'}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {unresolved.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-500 mb-2">{'Unresolved feedback piling up (' + unresolved.length + ')'}</p>
              <ul className="space-y-2">
                {unresolved.map(function(u) {
                  return (
                    <li key={u.business_id}>
                      <Link href={'/dashboard/admin/businesses/' + u.business_id} className="flex items-center justify-between gap-2 hover:bg-gray-50 rounded-lg px-2 py-1.5 -mx-2">
                        <span className="text-xs text-gray-700 truncate">{u.business_name}</span>
                        <span className="text-[11px] font-semibold text-red-500 shrink-0">{u.count + ' open'}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {credits.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-500 mb-2">{'Referral credits pending (' + credits.length + ')'}</p>
              <ul className="space-y-2">
                {credits.map(function(c) {
                  return (
                    <li key={c.signup_id}>
                      <Link href="/dashboard/admin/business-referrals" className="block hover:bg-gray-50 rounded-lg px-2 py-1.5 -mx-2">
                        <span className="text-xs text-gray-700 truncate block">{c.referrer_name + ' \u2192 ' + c.referred_name}</span>
                        <span className="text-[11px] text-gray-400">{fmtRelative(c.created_at)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DashboardPage() {
  const router = useRouter();
  const [stats,          setStats]          = useState(null);
  const [needsAttention, setNeedsAttention]  = useState(null);
  const [growthTrend,    setGrowthTrend]    = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');

  useEffect(function() {
    setLoading(true);
    setError('');
    Promise.all([
      api.get('/admin/dashboard-stats'),
      api.get('/admin/needs-attention'),
      api.get('/admin/growth-trend'),
    ]).then(function(results) {
      setStats(results[0].data.data);
      setNeedsAttention(results[1].data.data);
      setGrowthTrend(results[2].data.data);
    }).catch(function() {
      setError('Failed to load dashboard.');
    }).finally(function() {
      setLoading(false);
    });
  }, []);

  return (
    <DashboardLayout>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-subtitle">Platform overview</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <a href="/dashboard/admin" className="btn-secondary">Businesses</a>
          <a href="/dashboard/admin/audit-log" className="btn-secondary">Audit Log</a>
        </div>
      </div>

      {error && <div className="alert-error mb-5"><span>!</span><span>{error}</span></div>}

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map(function(_, i) {
              return <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />;
            })}
          </div>
          <div className="h-40 bg-white rounded-2xl border border-gray-100 animate-pulse" />
        </div>
      ) : stats ? (
        <>
          {/* 4 KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <KpiCard
              icon={'\uD83C\uDFE2'} iconBg="bg-blue-50"
              value={stats.businesses.total}
              label="Businesses"
              sub={stats.businesses.trial + ' Trial \u00b7 ' + stats.businesses.paid + ' Paid \u00b7 ' + stats.businesses.suspended + ' Suspended'}
            />
            <KpiCard
              icon={'\uD83D\uDCB3'} iconBg="bg-purple-50"
              value={(stats.subscriptions.starter || 0) + (stats.subscriptions.growth || 0) + (stats.subscriptions.pro || 0)}
              label="Paying Businesses"
              sub={(stats.subscriptions.starter || 0) + ' Starter \u00b7 ' + (stats.subscriptions.growth || 0) + ' Growth \u00b7 ' + (stats.subscriptions.pro || 0) + ' Pro'}
            />
            <KpiCard
              icon={'\u2B50'} iconBg="bg-amber-50"
              value={stats.reviews.public + stats.reviews.private}
              label="Reviews"
              sub={stats.reviews.public + ' Google redirects' + (stats.reviews.conversion_rate != null ? ' \u00b7 ' + stats.reviews.conversion_rate + '% conversion' : '')}
            />
            <KpiCard
              icon={'\uD83D\uDEA9'} iconBg={stats.reviews.unresolved > 0 ? 'bg-red-50' : 'bg-green-50'}
              value={stats.reviews.unresolved}
              label="Unresolved Feedback"
              sub={stats.businesses.expiring_soon + ' plan' + (stats.businesses.expiring_soon === 1 ? '' : 's') + ' expiring soon'}
            />
          </div>

          <GrowthTrendChart data={growthTrend} />

          <NeedsAttentionSection data={needsAttention} />

          {/* Review performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Review Performance</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.reviews.avg_rating != null ? stats.reviews.avg_rating + '\u2605' : '\u2014'}</p>
                  <p className="text-[11px] text-gray-400 mt-1">Avg rating</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.reviews.public}</p>
                  <p className="text-[11px] text-gray-400 mt-1">Google redirects</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.reviews.conversion_rate != null ? stats.reviews.conversion_rate + '%' : '\u2014'}</p>
                  <p className="text-[11px] text-gray-400 mt-1">Conversion</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Feedback Health</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.reviews.unresolved}</p>
                  <p className="text-[11px] text-gray-400 mt-1">Open</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.reviews.private - stats.reviews.unresolved}</p>
                  <p className="text-[11px] text-gray-400 mt-1">Resolved</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">
                    {stats.reviews.private > 0 ? Math.round(((stats.reviews.private - stats.reviews.unresolved) / stats.reviews.private) * 100) + '%' : '\u2014'}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">Resolution rate</p>
                </div>
              </div>
            </div>
          </div>

          {/* Subscriptions breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Subscriptions by Plan</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xl font-bold text-gray-900">{stats.subscriptions.free || 0}</p>
                <p className="text-[11px] text-gray-400 mt-1">Free</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{stats.subscriptions.starter || 0}</p>
                <p className="text-[11px] text-gray-400 mt-1">Starter</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{stats.subscriptions.growth || 0}</p>
                <p className="text-[11px] text-gray-400 mt-1">Growth</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{stats.subscriptions.pro || 0}</p>
                <p className="text-[11px] text-gray-400 mt-1">Pro</p>
              </div>
            </div>
            {((stats.subscriptions.basic || 0) + (stats.subscriptions.agency || 0)) > 0 && (
              <p className="text-[11px] text-amber-600 mt-3 pt-3 border-t border-gray-100">
                {(stats.subscriptions.basic || 0) + (stats.subscriptions.agency || 0) + ' business' + (((stats.subscriptions.basic || 0) + (stats.subscriptions.agency || 0)) === 1 ? ' is' : 'es are') + ' still on a retired plan (Basic/Agency) and should be migrated.'}
              </p>
            )}
            <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t border-gray-100">
              Revenue isn't shown here yet {'\u2014'} manual UPI billing doesn't record individual payments, so a real revenue number can't be calculated. Subscription counts above reflect actual plan assignments.
            </p>
          </div>

          {/* Growth sources — how businesses actually joined */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mt-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">How Businesses Joined</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2 text-base bg-purple-50">{'\uD83C\uDF1F'}</div>
                <p className="text-xl font-bold text-gray-900">{stats.growth_sources.via_referral}</p>
                <p className="text-[11px] text-gray-400 mt-1">Via business referral</p>
              </div>
              <div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2 text-base bg-blue-50">{'\u270D\uFE0F'}</div>
                <p className="text-xl font-bold text-gray-900">{stats.growth_sources.self_signup}</p>
                <p className="text-[11px] text-gray-400 mt-1">Self signup</p>
              </div>
              <div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2 text-base bg-amber-50">{'\uD83D\uDC64'}</div>
                <p className="text-xl font-bold text-gray-900">{stats.growth_sources.admin_created}</p>
                <p className="text-[11px] text-gray-400 mt-1">Created by admin</p>
              </div>
            </div>
            {stats.growth_sources.unknown > 0 && (
              <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t border-gray-100">
                {stats.growth_sources.unknown + ' business' + (stats.growth_sources.unknown === 1 ? '' : 'es') + ' from before this was tracked aren\u2019t counted above.'}
              </p>
            )}
          </div>
        </>
      ) : null}
    </DashboardLayout>
  );
}

export default withAuth(DashboardPage);
