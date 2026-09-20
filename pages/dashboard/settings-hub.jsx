/**
 * pages/dashboard/settings-hub.jsx
 * Settings hub -- landing page for the Settings section of the nav.
 * Cards out to each settings category page, plus Referrals (lives under
 * Growth already) and Team (owner-only).
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

function SettingsHubPage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';

  return (
    <DashboardLayout>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900 leading-tight">Settings</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Manage your business profile and account</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <HubCard
          href="/dashboard/settings/business-profile"
          icon={'\uD83C\uDFEA'}
          title="Business Profile"
          description="Name, photo, type, Google link"
        />
        <HubCard
          href="/dashboard/settings/message-templates"
          icon={'\uD83D\uDCAC'}
          title="Message Templates"
          description="Review requests, thank-yous, follow-ups"
        />
        <HubCard
          href="/dashboard/settings/review-settings"
          icon={'\u2699'}
          title="Review Settings"
          description="Workflow & customer consent"
        />
        <HubCard
          href="/dashboard/referrals"
          icon={'\uD83C\uDF81'}
          title="Referrals & Rewards"
          description="Manage your referral program"
        />
        <HubCard
          href="/dashboard/settings/billing"
          icon={'\uD83D\uDCB3'}
          title="Plan & Billing"
          description="Current plan, upgrade, payment"
        />
        <HubCard
          href="/dashboard/settings/account-security"
          icon={'\uD83D\uDD10'}
          title="Account & Security"
          description="Password, sign out, account info"
        />
        {!isStaff && (
          <HubCard
            href="/dashboard/team"
            icon={'\uD83D\uDC65'}
            title="Team"
            description="Manage staff accounts and roles"
          />
        )}
      </div>
    </DashboardLayout>
  );
}

export default withAuth(SettingsHubPage);