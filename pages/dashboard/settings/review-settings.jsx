/**
 * pages/dashboard/settings/review-settings.jsx
 * Review Settings -- workflow & customer consent (currently just the
 * WhatsApp consent toggle). Split out of the old monolithic settings.jsx.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/DashboardLayout';
import withAuth from '../../../components/withAuth';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';

function ReviewSettingsPage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [saved, setSaved]     = useState(false);
  const [whatsappConsentRequired, setWhatsappConsentRequired] = useState(true);

  useEffect(function() {
    var load = async function() {
      try {
        var res = await api.get('/business/my-settings');
        var b = res.data.data;
        setWhatsappConsentRequired(!!b.whatsapp_consent_required);
      } catch (e) {
        setError('Could not load settings. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleToggle = async () => {
    var next = !whatsappConsentRequired;
    setWhatsappConsentRequired(next);
    setSaved(false);
    setError('');
    setSaving(true);
    try {
      await api.patch('/business/my-settings', { whatsapp_consent_required: next });
      setSaved(true);
      setTimeout(function() { setSaved(false); }, 3000);
    } catch (err) {
      setWhatsappConsentRequired(!next);
      setError(err.response?.data?.error || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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
      <div className="p-4 md:p-6 max-w-2xl">
        <Link href="/dashboard/settings-hub" className="text-xs font-semibold text-purple-600 hover:text-purple-700 mb-2 inline-block">
          {'\u2190 Settings'}
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Review Settings</h1>
        <p className="text-sm text-gray-400 mb-6">Workflow and customer consent</p>

        {isStaff && (
          <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 mb-6">
            <span className="text-purple-500 text-lg shrink-0">{'\u2139\uFE0F'}</span>
            <p className="text-xs text-purple-700">
              {'You have view-only access to Settings. Contact your business owner to make changes.'}
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 mb-4">{error}</p>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <p className="text-sm font-medium text-gray-900">WhatsApp Consent Required</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {'Ask customers to confirm consent before sending WhatsApp messages.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              disabled={isStaff || saving}
              className={"relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed " +
                (whatsappConsentRequired ? "bg-purple-600" : "bg-gray-200")}
            >
              <span
                className={"inline-block h-4 w-4 transform rounded-full bg-white transition-transform " +
                  (whatsappConsentRequired ? "translate-x-6" : "translate-x-1")}
              />
            </button>
          </div>
          {saved && (
            <p className="text-sm text-green-600 font-medium mt-3">{'\u2713 Saved'}</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(ReviewSettingsPage);