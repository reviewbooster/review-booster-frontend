/**
 * pages/dashboard/growth-hub.jsx
 * Growth hub -- landing page for the Growth section of the nav.
 * Cards out to Referrals, Refer a Business, Win-Back, and Analytics.
 */

import { useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';
import InfoButton from '../../components/InfoButton';
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
  useEffect(function() { localStorage.setItem('rb_visited_growth', '1'); }, []);
  const isStaff = user?.role === 'staff';

  return (
    <DashboardLayout>
      <div className="mb-5 flex items-start gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Growth</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">Referrals, win-back campaigns, and your numbers.</p>
        </div>
        <InfoButton title="Growth" autoShowKey="growth">
          Understand review growth, campaign performance, and what{'\u2019'}s actually working. Referrals tracks customers who refer new business your way, Win-Back helps you re-engage customers who haven{'\u2019'}t been back in a while, and Analytics breaks down your review funnel and trends over time.
        </InfoButton>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <HubCard
          href="/dashboard/referrals"
          icon={
            <svg width="20" height="20" fill="none" stroke="#7C3AED" strokeWidth="1.8" viewBox="0 0 24 24">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path strokeLinecap="round" d="M8.59 10.51l6.83-3.02M8.59 13.49l6.83 3.02" />
            </svg>
          }
          title="Referrals"
          description="Manage your customer referral program"
        />
        {!isStaff && (
          <HubCard
            href="/dashboard/refer-a-business"
            icon={
              <svg width="20" height="20" fill="none" stroke="#7C3AED" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
              </svg>
            }
            title="Refer a Business"
            description="Refer another business to ReviewBooster"
          />
        )}
        {!isStaff && (
          <HubCard
            href="/dashboard/win-back"
            icon={
              <svg width="20" height="20" fill="none" stroke="#7C3AED" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.13-5.36M20 15a9 9 0 01-14.13 5.36" />
              </svg>
            }
            title="Win-Back"
            description="Re-engage customers who haven't been back in a while"
          />
        )}
        <HubCard
          href="/dashboard/analytics"
          icon={
            <svg width="20" height="20" fill="none" stroke="#7C3AED" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7h6v6" />
            </svg>
          }
          title="Analytics"
          description="Review funnel, trends, and feedback breakdown"
        />
      </div>
    </DashboardLayout>
  );
}

export default withAuth(GrowthHubPage);