/**
 * pages/dashboard/settings/business-profile.jsx
 * Business Profile -- photo, name, type, Google Review URL.
 * Split out of the old monolithic settings.jsx into its own category page.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/DashboardLayout';
import withAuth from '../../../components/withAuth';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';

function BusinessProfilePage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [saved, setSaved]     = useState(false);

  const [business, setBusiness] = useState(null);
  const [form, setForm] = useState({ name: '', type: '', type_other: '', google_review_url: '' });
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoDeleting, setLogoDeleting] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [showGoogleHelp, setShowGoogleHelp] = useState(false);

  var googleUrlError = '';
  var trimmedGoogleUrl = (form.google_review_url || '').trim();
  if (trimmedGoogleUrl && !trimmedGoogleUrl.startsWith('https://')) {
    googleUrlError = 'This must be a secure link starting with https://';
  } else if (trimmedGoogleUrl) {
    try {
      new URL(trimmedGoogleUrl);
    } catch (e) {
      googleUrlError = "This doesn't look like a valid link -- double check you copied the whole thing.";
    }
  }

  useEffect(function() {
    var load = async function() {
      try {
        var res = await api.get('/business/my-settings');
        var b = res.data.data;
        setBusiness(b);
        setForm({
          name: b.name || '',
          type: b.type || '',
          type_other: b.type_other || '',
          google_review_url: b.google_review_url || '',
        });
      } catch (e) {
        setError('Could not load settings. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleLogoChange = async (e) => {
    var file = e.target.files[0];
    if (!file) return;
    setLogoError('');
    setLogoUploading(true);
    try {
      var formData = new FormData();
      formData.append('logo', file);
      var res = await api.post('/business/my-logo', formData);
      setBusiness((prev) => ({ ...prev, brand_logo_url: res.data.data.brand_logo_url }));
    } catch (err) {
      setLogoError(err.response?.data?.error || 'Failed to upload photo.');
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteLogo = async () => {
    if (!window.confirm('Remove your business photo?')) return;
    setLogoError('');
    setLogoDeleting(true);
    try {
      var res = await api.delete('/business/my-logo');
      setBusiness((prev) => ({ ...prev, brand_logo_url: res.data.data.brand_logo_url }));
    } catch (err) {
      setLogoError(err.response?.data?.error || 'Failed to delete photo.');
    } finally {
      setLogoDeleting(false);
    }
  };

  const handleChange = (e) => {
    setSaved(false);
    setError('');
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);

    if (!form.name.trim()) {
      setError('Business name cannot be empty.');
      return;
    }
    if (googleUrlError) {
      setError('Please fix the Google Review URL before saving.');
      return;
    }
    if (form.type === 'other' && !form.type_other.trim()) {
      setError('Please tell us what kind of business you have.');
      return;
    }
    setSaving(true);
    try {
      var res = await api.patch('/business/my-settings', {
        name: form.name,
        type: form.type,
        type_other: form.type === 'other' ? form.type_other : '',
        google_review_url: form.google_review_url,
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
        <h1 className="text-xl font-bold text-gray-900 mb-1">Business Profile</h1>
        <p className="text-sm text-gray-400 mb-6">Your business name, type, photo, and Google review link</p>

        {isStaff && (
          <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 mb-6">
            <span className="text-purple-500 text-lg shrink-0">{'\u2139\uFE0F'}</span>
            <p className="text-xs text-purple-700">
              {'You have view-only access to Settings. Contact your business owner to make changes.'}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Business Photo</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center overflow-hidden shrink-0">
                {business?.brand_logo_url ? (
                  <img src={business.brand_logo_url} alt="Business logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-purple-300">{(form.name || '?').charAt(0).toUpperCase()}</span>
                )}
              </div>
              {!isStaff && (
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="inline-block bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer transition-colors">
                      {logoUploading ? 'Uploading...' : 'Change Photo'}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} disabled={logoUploading} />
                    </label>
                    {business?.brand_logo_url && (
                      <button
                        type="button"
                        onClick={handleDeleteLogo}
                        disabled={logoDeleting}
                        className="text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {logoDeleting ? 'Removing...' : 'Delete Photo'}
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">JPEG, PNG, or WebP. Square photos look best.</p>
                  {logoError && <p className="text-xs text-red-500 mt-1">{logoError}</p>}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Business Profile</h3>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Business Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                disabled={isStaff}
                className="w-full bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:opacity-70 disabled:cursor-not-allowed"
                placeholder="Your business name"
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Business Type</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                disabled={isStaff}
                className="w-full bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <option value="salon">Salon / Spa</option>
                <option value="barbershop">Barbershop / Hair Studio</option>
                <option value="gym">Gym / Fitness</option>
                <option value="dental">Dental Clinic</option>
                <option value="clinic">Medical Clinic</option>
                <option value="restaurant">Restaurant / Cafe</option>
                <option value="retail">Retail Store</option>
                <option value="auto">Auto Service</option>
                <option value="real_estate">Real Estate</option>
                <option value="education">Education / Coaching</option>
                <option value="pet_care">Pet Care / Veterinary</option>
                <option value="other">Other</option>
              </select>
              {form.type === 'other' && (
                <input
                  type="text"
                  name="type_other"
                  value={form.type_other}
                  onChange={handleChange}
                  disabled={isStaff}
                  placeholder="Tell us what kind of business, e.g. Photography Studio"
                  maxLength={50}
                  className="w-full mt-2 bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:opacity-70 disabled:cursor-not-allowed"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Google Review URL</label>
              <input
                type="url"
                name="google_review_url"
                value={form.google_review_url}
                onChange={handleChange}
                disabled={isStaff}
                className={'w-full bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed ' +
                  (googleUrlError ? 'ring-2 ring-red-300 focus:ring-red-300' : 'focus:ring-purple-200')}
                placeholder="https://g.page/r/.../review"
              />
              {googleUrlError && (
                <p className="text-xs text-red-500 mt-1.5">{googleUrlError}</p>
              )}
              <p className="text-xs text-gray-400 mt-1.5">
                {'Customers who leave a positive review get redirected here to post it on Google.'}
              </p>
              {!isStaff && (
                <>
                  <button
                    type="button"
                    onClick={function() { setShowGoogleHelp(!showGoogleHelp); }}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-700 mt-1.5 inline-flex items-center gap-1">
                    {showGoogleHelp ? '\u2212' : '+'} How do I find my Google Review link?
                  </button>
                  {showGoogleHelp && (
                    <div className="bg-purple-50 rounded-xl p-3.5 mt-2 text-xs text-gray-700 space-y-1.5">
                      <p className="font-semibold text-purple-700 mb-1">Follow these steps:</p>
                      <p>{'1. Go to '}<a href="https://business.google.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 underline">business.google.com</a>{' and sign in with the account that manages your business.'}</p>
                      <p>{'2. Select your business, then look for "Get more reviews" or "Ask for reviews" on the home screen.'}</p>
                      <p>{'3. Click it -- Google will show you a link to copy.'}</p>
                      <p>{'4. Paste that link here.'}</p>
                      <p className="text-gray-500 pt-1">
                        {'Tip: the link usually starts with '}<code className="bg-white px-1 py-0.5 rounded">g.page</code>{' or '}<code className="bg-white px-1 py-0.5 rounded">search.google.com</code>{'.'}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}

          {!isStaff && (
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
          )}
        </form>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(BusinessProfilePage);