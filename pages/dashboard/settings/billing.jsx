/**
 * pages/dashboard/settings/billing.jsx
 * Plan & Billing -- current plan for staff, full BillingPanel for owners.
 * Split out of the old monolithic settings.jsx into its own category page.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/DashboardLayout';
import withAuth from '../../../components/withAuth';
import BillingPanel from '../../../components/BillingPanel';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';

var PLAN_COLORS = {
  trial:  { bg: 'bg-purple-50', text: 'text-purple-600' },
  basic:  { bg: 'bg-blue-50',   text: 'text-blue-600' },
  pro:    { bg: 'bg-indigo-50', text: 'text-indigo-600' },
  agency: { bg: 'bg-purple-50', text: 'text-purple-600' },
};

function BillingSettingsPage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [business, setBusiness] = useState(null);

  useEffect(function() {
    if (!isStaff) { setLoading(false); return; }
    var load = async function() {
      try {
        var res = await api.get('/business/my-settings');
        setBusiness(res.data.data);
      } catch (e) {
        setError('Could not load billing info. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isStaff]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  var planColor = PLAN_COLORS[business?.plan] || PLAN_COLORS.trial;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-2xl">
        <Link href="/dashboard/settings-hub" className="text-xs font-semibold text-purple-600 hover:text-purple-700 mb-2 inline-block">
          {'\u2190 Settings'}
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Plan & Billing</h1>
        <p className="text-sm text-gray-400 mb-6">Current plan, upgrades, and payment</p>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 mb-4">{error}</p>
        )}

        {isStaff ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">Current Plan</p>
                <span className={'text-sm font-semibold px-2.5 py-1 rounded-full capitalize inline-block ' + planColor.bg + ' ' + planColor.text}>
                  {business?.plan || 'trial'}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">{business?.plan === 'trial' ? 'Trial Ends' : 'Plan Expires'}</p>
                <p className="text-gray-900 font-medium text-sm">
                  {business?.trial_ends_at
                    ? new Date(business.trial_ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '-'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <BillingPanel />
        )}
      </div>
    </DashboardLayout>
  );
}

export default withAuth(BillingSettingsPage);