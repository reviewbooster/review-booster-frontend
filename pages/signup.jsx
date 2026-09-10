import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

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

export default function SignupPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [businessName,    setBusinessName]    = useState('');
  const [businessType,    setBusinessType]    = useState('');
  const [businessTypeOther, setBusinessTypeOther] = useState('');
  const [ownerName,       setOwnerName]       = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [googleUrl,       setGoogleUrl]       = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [showConfirmPw,   setShowConfirmPw]   = useState(false);
  const [error,           setError]           = useState('');
  const [loading,         setLoading]         = useState(false);

  // Engine B — an incoming ?ref=CODE gets validated so we can show who
  // referred them and what discount applies, before they submit.
  const [refCode,     setRefCode]     = useState(null);
  const [referrerInfo, setReferrerInfo] = useState(null);

  useEffect(function() {
    if (!router.isReady) return;
    var q = router.query.ref;
    if (!q || typeof q !== 'string') return;
    setRefCode(q);
    api.get('/business-referrals/validate/' + encodeURIComponent(q))
      .then(function(res) { setReferrerInfo(res.data.data); })
      .catch(function() { /* invalid/expired code — just proceed without the banner */ });
  }, [router.isReady, router.query.ref]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (businessType === 'other' && !businessTypeOther.trim()) {
      setError('Please tell us what kind of business you have.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        business_name:    businessName,
        business_type:    businessType,
        owner_name:       ownerName,
        email,
        password,
        confirm_password: confirmPassword,
      };
      if (businessType === 'other') payload.business_type_other = businessTypeOther.trim();
      if (googleUrl) payload.google_review_url = googleUrl;
      if (refCode) payload.ref = refCode;
      await api.post('/auth/signup', payload);
      router.replace('/pending-approval');
    } catch (err) {
      setError(err.response?.data?.error || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-sidebar flex items-start sm:items-center justify-center p-4 py-8">

      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-3xl">{'\u2B50'}</span>
            <span className="text-white font-bold text-2xl tracking-tight">
              Review<span className="text-brand-500">Booster</span>
            </span>
          </div>
          <p className="text-white/40 text-sm">Create your account</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">

          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
              <span className="mt-0.5 shrink-0">{'\u26A0'}</span>
              <span>{error}</span>
            </div>
          )}

          {referrerInfo && (
            <div className="mb-5 p-3.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-sm flex items-start gap-2">
              <span className="mt-0.5 shrink-0">{'\uD83C\uDF81'}</span>
              <span className="text-white/80">
                {'Referred by '}<span className="font-semibold text-white">{referrerInfo.referrer_name}</span>
                {referrerInfo.referred_discount_pct > 0
                  ? ' \u2014 you\u2019ll get ' + referrerInfo.referred_discount_pct + '% off your first plan.'
                  : '.'}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Business Name */}
            <div>
              <label className="block text-sm font-semibold text-white/70 mb-1.5">
                Business Name
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Fitness First, Glow Salon..."
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors duration-150"
              />
            </div>

            {/* Business Type */}
            <div>
              <label className="block text-sm font-semibold text-white/70 mb-1.5">
                Business Type
              </label>
              <select
                required
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/10 text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors duration-150">
                <option value="" disabled className="text-gray-400 bg-white">Select type...</option>
                {BUSINESS_TYPES.map(function(t) {
                  return <option key={t.value} value={t.value} className="text-gray-900 bg-white">{t.label}</option>;
                })}
              </select>
              {businessType === 'other' && (
                <input
                  type="text"
                  required
                  value={businessTypeOther}
                  onChange={(e) => setBusinessTypeOther(e.target.value)}
                  placeholder="Tell us what kind of business, e.g. Photography Studio"
                  maxLength={50}
                  className="w-full mt-2 px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors duration-150"
                />
              )}
            </div>

            {/* Your Name */}
            <div>
              <label className="block text-sm font-semibold text-white/70 mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Rahul Sharma"
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors duration-150"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-white/70 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors duration-150"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-white/70 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(function(v) { return !v; })}
                  aria-label="Toggle password visibility"
                  className="absolute inset-y-0 right-0 flex items-center px-3.5 text-white/30 hover:text-white/70 transition-colors duration-150">
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-white/70 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(function(v) { return !v; })}
                  aria-label="Toggle confirm password visibility"
                  className="absolute inset-y-0 right-0 flex items-center px-3.5 text-white/30 hover:text-white/70 transition-colors duration-150">
                  {showConfirmPw ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Google Review URL (optional) */}
            <div>
              <label className="block text-sm font-semibold text-white/70 mb-1.5">
                Google Review URL
                <span className="text-white/30 font-normal ml-1.5">(optional)</span>
              </label>
              <input
                type="url"
                value={googleUrl}
                onChange={(e) => setGoogleUrl(e.target.value)}
                placeholder="https://g.page/r/..."
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors duration-150"
              />
              <p className="text-white/25 text-xs mt-1.5">You can add this later in Settings.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2">
              {loading ? (
                <>
                  <span className="spinner w-4 h-4" />
                  Creating account...
                </>
              ) : 'Create Account'}
            </button>

          </form>
        </div>

        <p className="text-center text-white/25 text-xs mt-6">
          Already have an account?{' '}
          <a href="/login"
            className="text-brand-500/70 hover:text-brand-500 transition-colors duration-150">
            Sign in
          </a>
        </p>

        <p className="text-center mt-2">
          <span className="text-white/20 text-xs">Powered by </span>
          <span className="text-white/35 text-xs font-semibold">Adcend</span>
        </p>

      </div>
    </div>
  );
}