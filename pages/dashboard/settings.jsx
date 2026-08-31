import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';

function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [saved, setSaved]     = useState(false);

  const [business, setBusiness] = useState(null);
  const [form, setForm] = useState({
    name: '',
    google_review_url: '',
    whatsapp_consent_required: true,
  });

  useEffect(function() {
    var load = async function() {
      try {
        var res = await api.get('/business/my-settings');
        var b = res.data.data;
        setBusiness(b);
        setForm({
          name: b.name || '',
          google_review_url: b.google_review_url || '',
          whatsapp_consent_required: !!b.whatsapp_consent_required,
        });
      } catch (e) {
        setError('Could not load settings. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (e) => {
    setSaved(false);
    setError('');
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleToggle = () => {
    setSaved(false);
    setForm((prev) => ({ ...prev, whatsapp_consent_required: !prev.whatsapp_consent_required }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);

    if (!form.name.trim()) {
      setError('Business name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      var res = await api.patch('/business/my-settings', {
        name: form.name,
        google_review_url: form.google_review_url,
        whatsapp_consent_required: form.whatsapp_consent_required,
      });
      setBusiness(res.data.data);
      setSaved(true);
      setTimeout(function() { setSaved(false); }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-gray-400 text-sm">Loading settings...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-2xl">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Settings</h1>
        <p className="text-sm text-gray-400 mb-6">Manage your business profile and preferences</p>

        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Business Profile</h2>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Business Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200"
                placeholder="Your business name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Google Review URL</label>
              <input
                type="url"
                name="google_review_url"
                value={form.google_review_url}
                onChange={handleChange}
                className="w-full bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200"
                placeholder="https://g.page/r/.../review"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                {'Customers who leave a positive review get redirected here to post it on Google.'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Preferences</h2>

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
                className={"relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 " +
                  (form.whatsapp_consent_required ? "bg-purple-600" : "bg-gray-200")}
              >
                <span
                  className={"inline-block h-4 w-4 transform rounded-full bg-white transition-transform " +
                    (form.whatsapp_consent_required ? "translate-x-6" : "translate-x-1")}
                />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Account Info</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-1">Business Type</p>
                <p className="text-gray-900 font-medium capitalize">{business?.type || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Plan</p>
                <p className="text-gray-900 font-medium capitalize">{business?.plan || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Trial Ends</p>
                <p className="text-gray-900 font-medium">
                  {business?.trial_ends_at
                    ? new Date(business.trial_ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '-'}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl px-6 py-2.5 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {saved && (
              <span className="text-sm text-green-600 font-medium">{'\u2713 Saved'}</span>
            )}
          </div>

        </form>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(SettingsPage);