/**
 * pages/dashboard/admin/businesses/[id].jsx
 * Business 360 — everything about one business in one place, instead of
 * nothing. Read-only rollup: customers, reviews, feedback, referrals,
 * billing. Clicked into from the business name on the Admin business list.
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../../components/DashboardLayout';
import withAuth from '../../../../components/withAuth';
import api from '../../../../lib/api';

function fmtDate(d) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysLeft(d) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

var PLAN_COLORS = {
  trial:  { bg: 'bg-amber-50',  text: 'text-amber-600' },
  basic:  { bg: 'bg-blue-50',   text: 'text-blue-600' },
  pro:    { bg: 'bg-indigo-50', text: 'text-indigo-600' },
  agency: { bg: 'bg-purple-50', text: 'text-purple-600' },
};

function PlanBadge({ plan }) {
  var c = PLAN_COLORS[plan] || PLAN_COLORS.trial;
  return (
    <span className={'text-xs font-semibold px-2.5 py-1 rounded-full capitalize ' + c.bg + ' ' + c.text}>
      {plan}
    </span>
  );
}

function StatCard({ icon, iconBg, label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className={'w-9 h-9 rounded-xl flex items-center justify-center mb-3 text-base ' + iconBg}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-[11px] text-gray-400 mt-1.5">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function BusinessDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(function() {
    if (!id) return;
    api.get('/admin/businesses/' + id + '/detail')
      .then(function(res) { setData(res.data.data); })
      .catch(function() { setError('Failed to load business detail.'); })
      .finally(function() { setLoading(false); });
  }, [id]);

  var expiryDate = data && (data.business.plan === 'trial' ? data.business.trial_ends_at : data.business.plan_expires_at);
  var expiryDays = daysLeft(expiryDate);
  var expiryUrgent = expiryDays !== null && expiryDays <= 3;
  var expiryWarn = expiryDays !== null && expiryDays > 3 && expiryDays <= 7;

  return (
    <DashboardLayout>
      <a href="/dashboard/admin" className="text-xs font-semibold text-purple-600 hover:underline mb-4 inline-flex items-center gap-1">
        {'\u2190 Back to Admin'}
      </a>

      {error && <div className="alert-error mb-5"><span>!</span><span>{error}</span></div>}

      {loading ? (
        <div className="space-y-4">
          <div className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map(function(_, i) {
              return <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />;
            })}
          </div>
        </div>
      ) : data ? (
        <>
          {/* Header card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 flex items-start gap-4 flex-wrap">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0" style={{ backgroundColor: '#7C3AED' }}>
              {data.business.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-gray-900">{data.business.name}</h1>
                {data.business.is_suspended && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">Suspended</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">{data.business.type}</span>
                <PlanBadge plan={data.business.plan} />
                <span className="text-xs text-gray-400">{'Joined ' + fmtDate(data.business.created_at)}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold mb-1">
                {data.business.plan === 'trial' ? 'Trial ends' : 'Plan expires'}
              </p>
              <p className="text-sm font-bold text-gray-900">{fmtDate(expiryDate)}</p>
              {expiryDays !== null && (
                <p className={'text-xs font-semibold mt-0.5 ' + (expiryUrgent ? 'text-red-500' : expiryWarn ? 'text-amber-500' : 'text-gray-400')}>
                  {expiryDays >= 0 ? expiryDays + ' day' + (expiryDays === 1 ? '' : 's') + ' left' : 'Expired'}
                </p>
              )}
            </div>
          </div>

          {/* Owner */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Owner</p>
            {data.owner ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-sm shrink-0">
                  {data.owner.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{data.owner.name}</p>
                  <p className="text-xs text-gray-400">{data.owner.email + ' \u00b7 joined ' + fmtDate(data.owner.joined)}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">No owner account found.</p>
            )}
          </div>

          {/* Stats */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Activity</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard icon={'\uD83D\uDC65'} iconBg="bg-blue-50" label="Customers" value={data.customers} />
            <StatCard icon={'\u2B50'} iconBg="bg-amber-50" label="Avg Rating"
              value={data.reviews.avg_rating != null ? data.reviews.avg_rating + '\u2605' : '\u2014'}
              sub={data.reviews.public + ' public reviews'} />
            <StatCard icon={'\uD83D\uDEA9'} iconBg="bg-orange-50" label="Private Feedback" value={data.reviews.private} />
            <StatCard icon={'\u2705'} iconBg={data.reviews.unresolved > 0 ? 'bg-red-50' : 'bg-green-50'}
              label="Unresolved" value={data.reviews.unresolved}
              sub={data.reviews.resolution_rate != null ? data.reviews.resolution_rate + '% resolved overall' : null} />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 text-base bg-indigo-50">{'\uD83D\uDC64'}</div>
              <p className="text-2xl font-bold text-gray-900 leading-none">{data.staff_count}</p>
              <p className="text-[11px] text-gray-400 mt-1.5">Staff login accounts</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 text-base bg-purple-50">{'\uD83C\uDF1F'}</div>
              <p className="text-2xl font-bold text-gray-900 leading-none">{data.referrals.businesses_referred}</p>
              <p className="text-[11px] text-gray-400 mt-1.5">Businesses referred (Engine B)</p>
            </div>
          </div>

          {/* Billing */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Billing</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs mb-1">Plan</p>
                <PlanBadge plan={data.business.plan} />
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">{data.business.plan === 'trial' ? 'Trial ends' : 'Plan expires'}</p>
                <p className="font-semibold text-gray-900">{fmtDate(expiryDate)}</p>
              </div>
              {data.business.referred_by_business_id && (
                <div className="col-span-2 pt-2 border-t border-gray-100">
                  <p className="text-gray-400 text-xs mb-1">Engine B signup discount</p>
                  <p className="text-xs text-gray-600">
                    {'Referred by another business \u2014 signup discount ' + (data.business.referral_discount_used ? 'already used' : 'not yet used')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Engine B code */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Engine B \u2014 Their Own Referral Code</p>
            <p className="font-mono font-bold text-gray-900 text-lg">{data.referrals.own_code || '\u2014'}</p>
            <p className="text-xs text-gray-400 mt-1">Used to refer other businesses to ReviewBooster.</p>
          </div>
        </>
      ) : null}
    </DashboardLayout>
  );
}

export default withAuth(BusinessDetailPage);
