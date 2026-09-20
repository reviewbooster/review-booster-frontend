/**
 * pages/onboarding.jsx
 * Post-signup setup wizard -- Business Details -> Google Link -> Message
 * Template -> Complete. Reached right after signup, and as a forced
 * redirect for anyone whose business still has onboarding_completed: false.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import SEO from '../components/SEO';
import { getDefaultTemplates } from '../lib/defaultMessageTemplates';

function stripGreetingToken(template) {
  if (!template) return '';
  return template.replace(/^\s*Hi\s*\{\{name\}\}\s*,?\s*/i, '').trim();
}

function stripLinkToken(template) {
  if (!template) return '';
  return template.replace(/\n*\{\{link\}\}\s*$/, '').trim();
}

const BUSINESS_TYPES = [
  { value: 'salon',       label: 'Salon / Spa' },
  { value: 'barbershop',  label: 'Barbershop / Hair Studio' },
  { value: 'gym',         label: 'Gym / Fitness' },
  { value: 'dental',      label: 'Dental Clinic' },
  { value: 'clinic',      label: 'Medical Clinic' },
  { value: 'restaurant',  label: 'Restaurant / Cafe' },
  { value: 'retail',      label: 'Retail Store' },
  { value: 'auto',        label: 'Auto Service' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'education',   label: 'Education / Coaching' },
  { value: 'pet_care',    label: 'Pet Care / Veterinary' },
  { value: 'other',       label: 'Other' },
];

const STEPS = ['business', 'google', 'message', 'complete'];
const STEP_NUMBERS = { business: 2, google: 3, message: 4 }; // 'Step X of 5' -- 1 is Account Details on /signup

function StepDots({ current }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-1">
      {[1, 2, 3, 4, 5].map(function(n) {
        return (
          <span
            key={n}
            className={'h-2 rounded-full transition-all ' +
              (n === current ? 'w-6 bg-brand-500' : n < current ? 'w-2 bg-brand-500/50' : 'w-2 bg-white/15')}
          />
        );
      })}
    </div>
  );
}

export default function OnboardingPage() {
  const { isAuthenticated, isLoading: authLoading, user, updateUser } = useAuth();
  const router = useRouter();

  const [pageLoading, setPageLoading] = useState(true);
  const [step, setStep] = useState('business');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Business Details
  const [name, setName] = useState('');
  const [type, setType] = useState('salon');
  const [typeOther, setTypeOther] = useState('');
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Google Link
  const [googleUrl, setGoogleUrl] = useState('');
  const [showGoogleHelp, setShowGoogleHelp] = useState(false);

  // Message Template
  const [template, setTemplate] = useState('');

  useEffect(function() {
    if (authLoading) return;
    if (!isAuthenticated) { router.replace('/login'); return; }

    var load = async function() {
      try {
        var res = await api.get('/business/my-settings');
        var b = res.data.data;
        if (b.onboarding_completed) { router.replace('/dashboard'); return; }
        setLogoUrl(b.brand_logo_url || null);
        var defaults = getDefaultTemplates(b.type);
        var rawTemplate = (b.message_templates && b.message_templates.review_request) || defaults.review_request;
        setTemplate(stripGreetingToken(stripLinkToken(rawTemplate)));
      } catch (e) {
        // If we can't load settings, still let them proceed with the wizard --
        // each step saves independently, so this isn't fatal.
      } finally {
        setPageLoading(false);
      }
    };
    load();
  }, [authLoading, isAuthenticated, router]);

  const handleLogoChange = async (e) => {
    var file = e.target.files[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      var formData = new FormData();
      formData.append('logo', file);
      var res = await api.post('/business/my-logo', formData);
      setLogoUrl(res.data.data.brand_logo_url);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload photo.');
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const goNext = async (patch) => {
    setError('');
    setSaving(true);
    try {
      if (patch) await api.patch('/business/my-settings', patch);
      var idx = STEPS.indexOf(step);
      setStep(STEPS[idx + 1]);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    setError('');
    var idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const handleBusinessNext = (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter your business name.'); return; }
    if (type === 'other' && !typeOther.trim()) { setError('Please tell us what kind of business you have.'); return; }
    goNext({ name: name.trim(), type, type_other: type === 'other' ? typeOther.trim() : '' });
  };

  const handleGoogleNext = (e) => {
    e.preventDefault();
    var trimmed = googleUrl.trim();
    if (trimmed && !trimmed.startsWith('https://')) {
      setError('This must be a secure link starting with https://');
      return;
    }
    goNext(trimmed ? { google_review_url: trimmed } : null);
  };

  const handleMessageNext = (e) => {
    e.preventDefault();
    var full = 'Hi {{name}}, ' + template.trim() + '\n\n{{link}}';
    goNext({ message_templates: { review_request: full } });
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await api.patch('/business/my-settings', { onboarding_completed: true });
      updateUser({ onboarding_completed: true });
    } catch (e) {
      // Even if this fails, don't trap them here -- worst case the wizard
      // shows once more next time.
    } finally {
      router.replace('/dashboard');
    }
  };

  if (authLoading || pageLoading) return null;

  return (
    <div className="min-h-screen bg-sidebar flex items-start sm:items-center justify-center p-4 py-8">
      <SEO title="Set Up Your Business" description="Finish setting up your ReviewBooster account." path="/onboarding" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">

        {step !== 'complete' && <StepDots current={STEP_NUMBERS[step]} />}

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">

          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
              <span className="mt-0.5 shrink-0">{'\u26A0'}</span>
              <span>{error}</span>
            </div>
          )}

          {step === 'business' && (
            <>
              <h1 className="text-white text-xl font-bold mb-1">Tell us about your business</h1>
              <p className="text-white/40 text-sm mb-6">This helps us personalize your setup.</p>

              <form onSubmit={handleBusinessNext} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-1.5">Business Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Glow Salon, Fitness First..."
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors duration-150"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-1.5">Business Type</label>
                  <select
                    required
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors duration-150"
                  >
                    {BUSINESS_TYPES.map(function(t) {
                      return <option key={t.value} value={t.value} className="bg-gray-900">{t.label}</option>;
                    })}
                  </select>
                  {type === 'other' && (
                    <input
                      type="text"
                      required
                      value={typeOther}
                      onChange={(e) => setTypeOther(e.target.value)}
                      placeholder="Tell us what kind of business, e.g. Photography Studio"
                      maxLength={50}
                      className="w-full mt-2 px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors duration-150"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-1.5">Business Photo</label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-brand-500/10 flex items-center justify-center overflow-hidden shrink-0">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Business logo" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-brand-500">
                          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <label className="inline-block bg-white/10 hover:bg-white/15 text-white/70 text-xs font-semibold px-3.5 py-2.5 rounded-lg cursor-pointer transition-colors">
                      {logoUploading ? 'Uploading...' : 'Add Photo'}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} disabled={logoUploading} />
                    </label>
                    <span className="text-white/25 text-[11px]">Show your business to customers</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 mt-2"
                >
                  {saving ? 'Saving...' : 'Next'}
                </button>
              </form>
            </>
          )}

          {step === 'google' && (
            <>
              <button
                type="button"
                onClick={goBack}
                className="text-white/30 hover:text-white/60 text-sm mb-4 -ml-1 transition-colors"
                aria-label="Back"
              >
                {'\u2190'}
              </button>
              <h1 className="text-white text-xl font-bold mb-1">Connect your Google review link</h1>
              <p className="text-white/40 text-sm mb-6">Copy and paste your Google review link. You can find it in your Google Business Profile.</p>

              <form onSubmit={handleGoogleNext} className="space-y-3">
                <input
                  type="url"
                  value={googleUrl}
                  onChange={(e) => setGoogleUrl(e.target.value)}
                  placeholder="https://g.page/r/..."
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors duration-150"
                />

                <button
                  type="button"
                  onClick={function() { setShowGoogleHelp(!showGoogleHelp); }}
                  className="text-xs font-semibold text-brand-500/80 hover:text-brand-500 inline-flex items-center gap-1"
                >
                  {showGoogleHelp ? '\u2212' : '+'} How to find your link?
                </button>
                {showGoogleHelp && (
                  <div className="bg-white/5 rounded-xl p-3.5 text-xs text-white/50 space-y-1.5">
                    <p>{'1. Go to '}<a href="https://business.google.com" target="_blank" rel="noopener noreferrer" className="text-brand-500/80 underline">business.google.com</a>{' and sign in.'}</p>
                    <p>{'2. Select your business, then look for "Get more reviews" or "Ask for reviews".'}</p>
                    <p>{'3. Copy the link Google shows you, and paste it above.'}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 mt-2"
                >
                  {saving ? 'Saving...' : 'Next'}
                </button>
                <button
                  type="button"
                  onClick={function() { goNext(null); }}
                  disabled={saving}
                  className="w-full py-2 text-white/30 hover:text-white/60 text-sm font-medium transition-colors"
                >
                  Skip for now
                </button>
              </form>
            </>
          )}

          {step === 'message' && (
            <>
              <button
                type="button"
                onClick={goBack}
                className="text-white/30 hover:text-white/60 text-sm mb-4 -ml-1 transition-colors"
                aria-label="Back"
              >
                {'\u2190'}
              </button>
              <h1 className="text-white text-xl font-bold mb-1">Set up your first message</h1>
              <p className="text-white/40 text-sm mb-6">{'Use our ready-made template or customize it later in Settings.'}</p>

              <form onSubmit={handleMessageNext} className="space-y-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 w-fit">
                  <span className="text-white/30">{'\uD83D\uDD12'}</span>
                  <span className="text-[11px] text-white/40 font-medium">{'Hi [Customer\u2019s Name], \u2014 added automatically'}</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-white/70 text-xs font-semibold">Review Request</span>
                    <span className="text-[10px] font-semibold text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded-full">Ready to use</span>
                  </div>
                  <textarea
                    rows={4}
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    className="w-full bg-transparent text-white/70 text-sm placeholder-white/25 outline-none resize-none"
                  />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 w-fit">
                  <span className="text-white/30">{'\uD83D\uDD12'}</span>
                  <span className="text-[11px] text-white/40 font-medium">{'Review link \u2014 added automatically at the end'}</span>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 mt-2"
                >
                  {saving ? 'Saving...' : 'Next'}
                </button>
                <button
                  type="button"
                  onClick={function() { goNext(null); }}
                  disabled={saving}
                  className="w-full py-2 text-white/30 hover:text-white/60 text-sm font-medium transition-colors"
                >
                  Skip for now
                </button>
              </form>
            </>
          )}

          {step === 'complete' && (
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-full bg-brand-500 flex items-center justify-center mx-auto mb-5">
                <svg width="28" height="28" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-white text-xl font-bold mb-2">You're all set!</h1>
              <p className="text-white/40 text-sm leading-relaxed mb-6">
                {'Your business is ready. Start sending review requests and watch your ratings grow.'}
              </p>
              <button
                onClick={handleComplete}
                disabled={saving}
                className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
              >
                {saving ? 'Loading...' : 'Go to Dashboard'}
              </button>
            </div>
          )}

        </div>

        <p className="text-center mt-6">
          <span className="text-white/20 text-xs">Powered by </span>
          <span className="text-white/35 text-xs font-semibold">Adcend</span>
        </p>

      </div>
    </div>
  );
}