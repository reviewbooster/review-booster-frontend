/**
 * pages/owner/settings.jsx
 *
 * Phase 6 (Owner Dashboard spec, "Settings and Reports", section 12
 * precedence model): org-wide defaults for the business, replacing the
 * Phase 2 placeholder.
 *
 * Scope decision (agreed with Vivek -- no separate spec doc existed for
 * this phase the way Campaigns had one): the branch dashboard already has
 * a full Settings hub split across several pages (Business Profile,
 * Message Templates, Review Settings, Billing, Account & Security), all
 * still reachable by the owner via "Switch to Branch Dashboard". Rather
 * than duplicate that whole hub inside the Owner Dashboard, this page
 * consolidates the ORG-WIDE settings that actually matter at the business
 * level (profile, message templates, review workflow) into one page, and
 * is explicit that branch-level overrides (a location's own Google review
 * URL / logo -- already real fields on the Location model since Phase 1,
 * already editable since Phase 3) live on the Locations page, not here.
 * Billing and Account & Security are intentionally NOT duplicated here --
 * a note links out to the branch dashboard for those, since this page
 * uses the EXACT same backend contract the branch dashboard's settings
 * pages already use (GET/PATCH /business/my-settings, POST/DELETE
 * /business/my-logo), so nothing here is new data, just a new place to
 * edit the business-wide defaults from.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import OwnerDashboardLayout from '../../components/OwnerDashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';

const BUSINESS_TYPES = [
  { value: 'salon', label: 'Salon' },
  { value: 'barbershop', label: 'Barbershop' },
  { value: 'gym', label: 'Gym' },
  { value: 'dental', label: 'Dental' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'retail', label: 'Retail' },
  { value: 'auto', label: 'Auto' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'education', label: 'Education' },
  { value: 'pet_care', label: 'Pet Care' },
  { value: 'other', label: 'Other' },
];

function SettingsSkeleton() {
  return (
    <OwnerDashboardLayout title="Settings" subtitle="Loading…">
      <div className="space-y-3">
        {[1, 2, 3].map(function(i) { return <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />; })}
      </div>
    </OwnerDashboardLayout>
  );
}

function OwnerSettingsPage() {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [notice, setNotice]     = useState('');

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [typeOther, setTypeOther] = useState('');
  const [googleUrl, setGoogleUrl] = useState('');
  const [consentRequired, setConsentRequired] = useState(true);
  const [templates, setTemplates] = useState({ review_request: '', thank_refer: '', resolved_followup: '' });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);
  const [templatesLocked, setTemplatesLocked] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);

  function load() {
    setLoading(true);
    setError('');
    api.get('/business/my-settings')
      .then(function(res) {
        const b = res.data.data;
        setBusiness(b);
        setName(b.name || '');
        setType(b.type || '');
        setTypeOther(b.type_other || '');
        setGoogleUrl(b.google_review_url || '');
        setConsentRequired(b.whatsapp_consent_required !== false);
        setTemplates({
          review_request:    (b.message_templates && b.message_templates.review_request) || '',
          thank_refer:       (b.message_templates && b.message_templates.thank_refer) || '',
          resolved_followup: (b.message_templates && b.message_templates.resolved_followup) || '',
        });
      })
      .catch(function() { setError('Could not load settings.'); })
      .finally(function() { setLoading(false); });
  }

  useEffect(function() { load(); }, []);

  function showNotice(msg) {
    setNotice(msg);
    setTimeout(function() { setNotice(''); }, 3000);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Business name is required.'); return; }
    if (googleUrl.trim() && !googleUrl.trim().startsWith('https://')) {
      setError('Google review URL must start with https://.');
      return;
    }
    setSavingProfile(true);
    try {
      const payload = { name: name.trim(), type, google_review_url: googleUrl.trim() || null };
      if (type === 'other') payload.type_other = typeOther.trim();
      await api.patch('/business/my-settings', payload);
      showNotice('Business profile updated.');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save your profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveTemplates(e) {
    e.preventDefault();
    setError('');
    setTemplatesLocked(null);
    setSavingTemplates(true);
    try {
      await api.patch('/business/my-settings', { message_templates: templates });
      showNotice('Message templates updated.');
      load();
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.code === 'PLAN_LOCKED') {
        setTemplatesLocked(err.response.data.error || 'Custom message templates are not available on your current plan.');
      } else {
        setError(err.response?.data?.error || 'Could not save your templates.');
      }
    } finally {
      setSavingTemplates(false);
    }
  }

  async function handleToggleConsent() {
    const next = !consentRequired;
    setConsentRequired(next);
    setSavingConsent(true);
    try {
      await api.patch('/business/my-settings', { whatsapp_consent_required: next });
      showNotice('Review workflow updated.');
    } catch (err) {
      setConsentRequired(!next); // revert on failure
      setError(err.response?.data?.error || 'Could not update that setting.');
    } finally {
      setSavingConsent(false);
    }
  }

  async function handleLogoFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('logo', file);
      await api.post('/business/my-logo', formData);
      showNotice('Logo updated.');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not upload that image.');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemoveLogo() {
    setUploadingLogo(true);
    try {
      await api.delete('/business/my-logo');
      showNotice('Logo removed.');
      load();
    } catch (err) {
      setError('Could not remove the logo.');
    } finally {
      setUploadingLogo(false);
    }
  }

  if (loading && !business) return <SettingsSkeleton />;

  return (
    <OwnerDashboardLayout title="Settings" subtitle="Business-wide defaults, applied across every location">
      {notice && <div className="alert-success mb-4"><span>{'✓'}</span><span>{notice}</span></div>}
      {error && <div className="alert-error mb-4"><span>{'⚠'}</span><span>{error}</span></div>}

      <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-4 mb-5 text-xs text-purple-700">
        These are business-wide defaults. A location can override its own Google review URL and logo on the{' '}
        <Link href="/owner/locations" className="font-semibold underline">Locations</Link> page -- if a location
        doesn't set its own, it falls back to what's set here.
      </div>

      {/* Business Profile */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Business Profile</h2>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
            {business?.brand_logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.brand_logo_url} alt="Business logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">{'🏢'}</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={uploadingLogo}
              onClick={function() { fileInputRef.current && fileInputRef.current.click(); }}
              className="btn-secondary text-xs"
            >
              {uploadingLogo ? 'Uploading...' : 'Change Logo'}
            </button>
            {business?.brand_logo_url && (
              <button type="button" disabled={uploadingLogo} onClick={handleRemoveLogo} className="text-xs font-semibold text-red-500 hover:text-red-600">
                Remove
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoFile} />
          </div>
        </div>

        <div className="mb-3">
          <label className="label">Business Name</label>
          <input className="input" value={name} onChange={function(e) { setName(e.target.value); }} />
        </div>

        <div className="mb-3">
          <label className="label">Business Type</label>
          <select className="input" value={type} onChange={function(e) { setType(e.target.value); }}>
            {BUSINESS_TYPES.map(function(t) { return <option key={t.value} value={t.value}>{t.label}</option>; })}
          </select>
        </div>

        {type === 'other' && (
          <div className="mb-3">
            <label className="label">Describe your business</label>
            <input className="input" value={typeOther} onChange={function(e) { setTypeOther(e.target.value); }} placeholder="e.g. Photography Studio" />
          </div>
        )}

        <div className="mb-4">
          <label className="label">Default Google Review URL</label>
          <input className="input" value={googleUrl} onChange={function(e) { setGoogleUrl(e.target.value); }} placeholder="https://g.page/r/.../review" />
          <p className="text-[10px] text-gray-400 mt-1">Used by any location that hasn't set its own.</p>
        </div>

        <button type="submit" disabled={savingProfile} className="btn-primary">
          {savingProfile ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      {/* Message Templates */}
      <form onSubmit={handleSaveTemplates} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Message Templates</h2>
        <p className="text-xs text-gray-400 mb-4">Business-wide wording for outgoing customer messages. Leave blank to use the built-in default.</p>

        {templatesLocked && (
          <div className="alert-error mb-4"><span>{'🔒'}</span><span>{templatesLocked}</span></div>
        )}

        <div className="mb-3">
          <label className="label">Review Request</label>
          <textarea
            className="input"
            rows={3}
            value={templates.review_request}
            onChange={function(e) { setTemplates(function(t) { return Object.assign({}, t, { review_request: e.target.value }); }); }}
            placeholder="Default review request message"
          />
        </div>
        <div className="mb-3">
          <label className="label">Thank You + Refer</label>
          <textarea
            className="input"
            rows={3}
            value={templates.thank_refer}
            onChange={function(e) { setTemplates(function(t) { return Object.assign({}, t, { thank_refer: e.target.value }); }); }}
            placeholder="Default thank-you message"
          />
        </div>
        <div className="mb-4">
          <label className="label">Resolved Follow-up</label>
          <textarea
            className="input"
            rows={3}
            value={templates.resolved_followup}
            onChange={function(e) { setTemplates(function(t) { return Object.assign({}, t, { resolved_followup: e.target.value }); }); }}
            placeholder="Default follow-up after resolving feedback"
          />
        </div>

        <button type="submit" disabled={savingTemplates} className="btn-primary">
          {savingTemplates ? 'Saving...' : 'Save Templates'}
        </button>
      </form>

      {/* Review Workflow */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Review Workflow</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Require WhatsApp consent</p>
            <p className="text-xs text-gray-400 mt-0.5">Ask customers to opt in before sending WhatsApp review requests.</p>
          </div>
          <button
            type="button"
            disabled={savingConsent}
            onClick={handleToggleConsent}
            className={'shrink-0 w-11 h-6 rounded-full transition-colors relative disabled:opacity-50 ' + (consentRequired ? 'bg-purple-600' : 'bg-gray-200')}
          >
            <span className={'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ' + (consentRequired ? 'translate-x-5' : 'translate-x-0.5')} />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Need billing or account/security settings? Switch to the{' '}
        <Link href="/dashboard/select-branch" className="font-semibold text-purple-600 hover:underline">Branch Dashboard</Link>
        {' '}-- those stay there for now.
      </p>
    </OwnerDashboardLayout>
  );
}

export default withAuth(OwnerSettingsPage, { requiredRole: 'owner' });
