/**
 * pages/dashboard/settings.jsx
 * Retired -- split into pages/dashboard/settings/*.jsx category pages,
 * reachable from the Settings hub. This file just redirects anyone who
 * still has the old URL bookmarked or linked.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';

function SettingsRedirectPage() {
  const router = useRouter();

  useEffect(function() {
    router.replace('/dashboard/settings-hub');
  }, [router]);

  return (
    <DashboardLayout>
      <div className="p-6">
        <p className="text-gray-400 text-sm">Redirecting...</p>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(SettingsRedirectPage);