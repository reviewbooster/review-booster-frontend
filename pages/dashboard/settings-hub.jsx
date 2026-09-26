/**
 * pages/dashboard/settings-hub.jsx
 * Settings hub -- landing page for the Settings section of the nav.
 * Cards out to each settings category page, plus Referrals (lives under
 * Growth already) and Team (owner-only).
 */

import { useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';
import { useAuth } from '../../context/AuthContext';

function HubCard({ id, href, icon, title, description }) {
  return (
    <Link
      id={id}
      href={href}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:border-purple-200 hover:shadow-md transition-all"
    >
      <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
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

  useEffect(function() {
    setTimeout(function() {
      if (window.__rbStartDeepDive) window.__rbStartDeepDive('settings');
    }, 50);
  }, []);

  return (
    <DashboardLayout>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900 leading-tight">Settings</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Manage your business profile and account</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <HubCard
          id="tour-settings-profile"
          href="/dashboard/settings/business-profile"
          icon={
            <svg width="20" height="20" fill="none" stroke="#7C3AED" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
            </svg>
          }
          title="Business Profile"
          description="Name, photo, type, Google link"
        />
        <HubCard
          id="tour-settings-templates"
          href="/dashboard/settings/message-templates"
          icon={
            <svg width="20" height="20" fill="none" stroke="#7C3AED" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
          title="Message Templates"
          description="Review requests, thank-yous, follow-ups"
        />
        <HubCard
          href="/dashboard/settings/review-settings"
          icon={
            <svg width="20" height="20" fill="none" stroke="#7C3AED" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          }
          title="Review Settings"
          description="Workflow & customer consent"
        />
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
          title="Referrals & Rewards"
          description="Manage your referral program"
        />
        <HubCard
          href="/dashboard/settings/billing"
          icon={
            <svg width="20" height="20" fill="none" stroke="#7C3AED" strokeWidth="1.8" viewBox="0 0 24 24">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path strokeLinecap="round" d="M2 10h20" />
            </svg>
          }
          title="Plan & Billing"
          description="Current plan, upgrade, payment"
        />
        <HubCard
          href="/dashboard/settings/account-security"
          icon={
            <svg width="20" height="20" fill="none" stroke="#7C3AED" strokeWidth="1.8" viewBox="0 0 24 24">
              <rect x="4" y="11" width="16" height="9" rx="2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0v4" />
            </svg>
          }
          title="Account & Security"
          description="Password, sign out, account info"
        />
        {!isStaff && (
          <HubCard
            href="/dashboard/team"
            icon={
              <svg width="20" height="20" fill="none" stroke="#7C3AED" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1a4 4 0 100-8 4 4 0 000 8zm6 3a4 4 0 00-3-3.87" />
              </svg>
            }
            title="Team"
            description="Manage staff accounts and roles"
          />
        )}
      </div>
    </DashboardLayout>
  );
}

export default withAuth(SettingsHubPage);