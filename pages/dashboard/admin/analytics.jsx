/**
 * pages/dashboard/admin/analytics.jsx
 * Platform-wide review performance. Real data only: no MRR, no churn, no
 * fabricated engagement score -- just review volume, ratings, and request
 * channels, the same way the rest of this admin panel works.
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/DashboardLayout';
import withAuth from '../../../components/withAuth';
import api from '../../../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

function fmtWeek(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function RatingRow({ r, highlight }) {
  return (
    <Link href={'/dashboard/admin/businesses/' + r.business_id}
      className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
      <span className="text-sm text-gray-800 truncate">{r.business_name}</span>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] text-gray-400">{r.count + ' reviews'}</span>
        <span className={'text-sm font-bold ' + highlight}>{r.avg_rating.toFixed(1)}{'\u2605'}</span>
      </div>
    </Link>
  );
}

function AnalyticsPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(function() {
    api.get('/admin/analytics')
      .then(function(res) { setData(res.data.data); })
      .catch(function() { setError('Failed to load analytics.'); })
      .finally(function() { setLoading(false); });
  }, []);

  var chartData = data ? data.review_trend.map(function(b) {
    return { label: fmtWeek(b.week_start), Public: b.public_count, Private: b.private_count };
  }) : [];

  var totalReviews = data ? data.review_trend.reduce(function(s, b) { return s + b.public_count + b.private_count; }, 0) : 0;
  var totalChannel = data ? data.channel_breakdown.reduce(function(s, c) { return s + c.count; }, 0) : 0;

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Review volume, ratings, and request channels across all businesses.</p>
      </div>

      {error && <div className="alert-error mb-5"><span>!</span><span>{error}</span></div>}

      {loading ? (
        <div className="space-y-4">
          <div className="h-64 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          <div className="h-48 bg-white rounded-2xl border border-gray-100 animate-pulse" />
        </div>
      ) : data && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Review Volume (8 weeks)</p>
              <p className="text-xs text-gray-400">{totalReviews + ' total'}</p>
            </div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Public" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="Private" stackId="a" fill="#F59E0B" radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Top Rated</p>
              <p className="text-[11px] text-gray-400 mb-2">{'Min ' + data.ranking_min_reviews + ' reviews to qualify'}</p>
              {data.top_businesses.length === 0 ? (
                <p className="text-xs text-gray-400 py-3">Not enough data yet.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data.top_businesses.map(function(r) {
                    return <RatingRow key={r.business_id} r={r} highlight="text-green-600" />;
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Lowest Rated</p>
              <p className="text-[11px] text-gray-400 mb-2">{'Min ' + data.ranking_min_reviews + ' reviews to qualify'}</p>
              {data.bottom_businesses.length === 0 ? (
                <p className="text-xs text-gray-400 py-3">Not enough data yet.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data.bottom_businesses.map(function(r) {
                    return <RatingRow key={r.business_id} r={r} highlight="text-red-500" />;
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Request Channels</p>
            {data.channel_breakdown.length === 0 ? (
              <p className="text-xs text-gray-400">No review requests sent yet.</p>
            ) : (
              <div className="space-y-2">
                {data.channel_breakdown.map(function(c) {
                  var pct = totalChannel > 0 ? Math.round((c.count / totalChannel) * 100) : 0;
                  return (
                    <div key={c.channel}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600 capitalize">{c.channel}</span>
                        <span className="text-xs text-gray-400">{c.count + ' (' + pct + '%)'}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: pct + '%' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

export default withAuth(AnalyticsPage);