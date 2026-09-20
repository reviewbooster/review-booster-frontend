/**
 * pages/dashboard/settings/account-security.jsx
 * Account & Security -- Account Info + Change Password + Sign Out, combined.
 * Split out of the old monolithic settings.jsx into its own category page.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/DashboardLayout';
import withAuth from '../../../components/withAuth';
import ChangePasswordModal from '../../../components/ChangePasswordModal';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';

const TYPE_LABELS = {
  salon: 'Salon / Spa',
  barbershop: 'Barbershop / Hair Studio',
  gym: 'Gym / Fitness',
  dental: 'Dental Clinic',
  clinic: 'Medical Clinic',
  restaurant: 'Restaurant / Cafe',
  retail: 'Retail Store',
  auto: 'Auto Service',
  real_estate: 'Real Estate',
  education: 'Education / Coaching',
  pet_care: 'Pet Care / Veterinary',
};
function typeDisplayLabel(business) {
  if (!business || !business.type) return '-';
  if (business.type === 'other') return business.type_other || 'Other';
  return TYPE_LABELS[business.type] || business.type;
}

function AccountSecurityPage() {
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [business, setBusiness] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  useEffect(function() {
    var load = async function() {
      try {
        var res = await api.get('/business/my-settings');
        setBusiness(res.data.data);
      } catch (e) {
        setError('Could not load account info. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ChangePasswordModal isOpen={showChangePassword} onClose={function() { setShowChangePassword(false); }} />

      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={function() { setShowSignOutConfirm(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5" onClick={function(e) { e.stopPropagation(); }}>
            <h2 className="font-bold text-gray-900 mb-1">Sign Out</h2>
            <p className="text-sm text-gray-500 mb-5">Are you sure you want to sign out?</p>
            <div className="flex gap-3">
              <button onClick={function() { setShowSignOutConfirm(false); }} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={logout} className="flex-1 justify-center flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 md:p-6 max-w-2xl">
        <Link href="/dashboard/settings-hub" className="text-xs font-semibold text-purple-600 hover:text-purple-700 mb-2 inline-block">
          {'\u2190 Settings'}
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Account & Security</h1>
        <p className="text-sm text-gray-400 mb-6">Your account details, password, and sign out</p>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 mb-4">{error}</p>
        )}

        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-3">Account Info</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Your Name</p>
                  <p className="text-gray-900 font-medium">{user?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Role</p>
                  <p className="text-gray-900 font-medium capitalize">{user?.role || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Business Type</p>
                  <p className="text-gray-900 font-medium">{typeDisplayLabel(business)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Member Since</p>
                  <p className="text-gray-900 font-medium">
                    {business?.created_at
                      ? new Date(business.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-base font-bold text-gray-900 mb-3">Change Password</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
              <p className="text-sm text-gray-500">Update the password you use to sign in.</p>
              <button onClick={function() { setShowChangePassword(true); }} className="btn-secondary shrink-0">
                Change Password
              </button>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-base font-bold text-gray-900 mb-3">Sign Out</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
              <p className="text-sm text-gray-500">Sign out of your ReviewBooster account on this device.</p>
              <button
                onClick={function() { setShowSignOutConfirm(true); }}
                className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-sm font-semibold transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(AccountSecurityPage);