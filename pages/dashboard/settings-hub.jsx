/**
 * pages/dashboard/settings-hub.jsx
 * Settings hub -- landing page for the Settings section of the nav.
 * Cards out to Team and Settings (both owner-only, matching prior nav behaviour).
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
        <p className="text-[13px] text-gray-400 mt-0.5">Manage your team and business settings.</p>
      </div>
      {isStaff ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <p className="text-sm text-gray-500">Settings are managed by the business owner.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <HubCard
            href="/dashboard/team"
            icon={'\uD83D\uDC65'}
            title="Team"
            description="Manage staff accounts and roles"
          />
          <HubCard
            href="/dashboard/settings"
            icon={'\u2699'}
            title="Settings"
            description="Business profile, billing, and preferences"
          />
        </div>
      )}
    </DashboardLayout>
  );
}

export default withAuth(SettingsHubPage);