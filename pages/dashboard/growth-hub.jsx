/**
 * pages/dashboard/growth-hub.jsx
 * Growth hub -- landing page for the Growth section of the nav.
 * Cards out to Referrals, Refer a Business, Win-Back, and Analytics.
 */

import Link from 'next/link';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';
import { useAuth } from '../../context/AuthContext';

function HubCard({ href, icon, title, description }) {
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:border-purple-200 hover:shadow-md transition-all"
    >
      <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 text-xl">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <span className="text-gray-300 text-lg shrink-0">{'\u2192'}</span>
    </Link>
  );
}

function GrowthHubPage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';

  return (
    <DashboardLayout>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900 leading-tight">Growth</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Referrals, win-back campaigns, and your numbers.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <HubCard
          href="/dashboard/referrals"
          icon={'\uD83C\uDF81'}
          title="Referrals"
          description="Manage your customer referral program"
        />
        {!isStaff && (
          <HubCard
            href="/dashboard/refer-a-business"
            icon={'\uD83C\uDF1F'}
            title="Refer a Business"
            description="Refer another business to ReviewBooster"
          />
        )}
        {!isStaff && (
          <HubCard
            href="/dashboard/win-back"
            icon={'\uD83D\uDC8C'}
            title="Win-Back"
            description="Re-engage customers who haven't been back in a while"
          />
        )}
        <HubCard
          href="/dashboard/analytics"
          icon={'\uD83D\uDCC8'}
          title="Analytics"
          description="Review funnel, trends, and feedback breakdown"
        />
      </div>
    </DashboardLayout>
  );
}

export default withAuth(GrowthHubPage);