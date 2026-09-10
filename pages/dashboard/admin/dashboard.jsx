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

function DashboardPage() {
  const router = useRouter();
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(function() {
    setLoading(true);
    setError('');
    api.get('/admin/dashboard-stats').then(function(res) {
      setStats(res.data.data);
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
              value={stats.subscriptions.basic + stats.subscriptions.pro + stats.subscriptions.agency}
              label="Active Subscriptions"
              sub={stats.subscriptions.basic + ' Basic \u00b7 ' + stats.subscriptions.pro + ' Pro \u00b7 ' + stats.subscriptions.agency + ' Agency'}
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
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Subscriptions</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xl font-bold text-gray-900">{stats.subscriptions.basic}</p>
                <p className="text-[11px] text-gray-400 mt-1">Basic</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{stats.subscriptions.pro}</p>
                <p className="text-[11px] text-gray-400 mt-1">Pro</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{stats.subscriptions.agency}</p>
                <p className="text-[11px] text-gray-400 mt-1">Agency</p>
              </div>
            </div>
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
