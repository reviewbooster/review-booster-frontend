/**
 * pages/signup/verify.jsx
 * Step 3 of signup, as its own page: enter the 6-digit code emailed from
 * /signup. The rest of the signup form (name, email, phone, password)
 * travels here via sessionStorage, set by /signup right before navigating
 * -- cleared the moment it's used below.
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import SEO from '../../components/SEO';

export default function VerifyEmailPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const router = useRouter();

  const [pending,  setPending]  = useState(null); // { owner_name, email, phone, password, confirm_password, ref }
  const [otpCode,  setOtpCode]  = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [storageError, setStorageError] = useState(false);

  // TEMPORARY DEBUG -- surfaces any crash or unhandled error directly on
  // screen as an alert, since mobile has no dev tools. Remove once the
  // mobile-only signup issue is found.
  useEffect(function() {
    function onErr(e) {
      window.alert('DEBUG window.onerror: ' + (e.message || e) + ' @ ' + (e.filename || '') + ':' + (e.lineno || ''));
    }
    function onRejection(e) {
      var reason = e.reason;
      var msg = reason && reason.message ? reason.message : JSON.stringify(reason);
      window.alert('DEBUG unhandledrejection: ' + msg);
    }
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRejection);
    return function() {
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  useEffect(function() {
    if (typeof window === 'undefined') return;
    try {
      var raw = sessionStorage.getItem('rb_pending_signup');
      if (!raw) {
        router.replace('/signup');
        return;
      }
      setPending(JSON.parse(raw));
    } catch (e) {
      // sessionStorage can throw on some mobile browsers (private/incognito
      // tabs, some in-app webviews, certain PWA modes) -- never let that
      // crash the page. Send them back to re-enter their details instead.
      setStorageError(true);
    }
  }, [router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(function() {
    if (resendCooldown <= 0) return;
    var t = setTimeout(function() { setResendCooldown(function(s) { return s - 1; }); }, 1000);
    return function() { clearTimeout(t); };
  }, [resendCooldown]);

  const handleResendOtp = async function() {
    if (resendCooldown > 0 || otpSending || !pending) return;
    setError('');
    setOtpSending(true);
    try {
      await api.post('/auth/signup/request-otp', { email: pending.email }, { timeout: 30000 });
      setResendCooldown(60);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not resend the code. Please try again.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!pending) return;
    setError('');
    setLoading(true);
    try {
      const payload = {
        business_name:    pending.owner_name.trim() + "'s Business",
        business_type:    'other',
        business_type_other: 'General',
        owner_name:       pending.owner_name,
        email:            pending.email,
        phone:            pending.phone,
        password:         pending.password,
        confirm_password: pending.confirm_password,
        otp_code:         otpCode,
      };
      if (pending.ref) payload.ref = pending.ref;
      const res = await api.post('/auth/signup', payload);
      sessionStorage.removeItem('rb_pending_signup');
      login(res.data);
      router.replace('/onboarding');
    } catch (err) {
      setError(err.response?.data?.error || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (storageError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-sm text-center">
          <p className="text-gray-900 font-semibold mb-2">Something interrupted signup</p>
          <p className="text-gray-500 text-sm mb-5">Your browser blocked a step needed to continue (this can happen in private/incognito mode). Please go back and try again.</p>
          <button
            type="button"
            onClick={function() { router.push('/signup'); }}
            className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition-all duration-150"
          >
            Back to Sign Up
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || isAuthenticated || !pending) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-start sm:items-center justify-center p-4 py-8">
      <SEO title="Verify Email" description="Verify your email to finish creating your ReviewBooster account." path="/signup/verify" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-3xl">{'\u2B50'}</span>
            <span className="text-gray-900 font-bold text-2xl tracking-tight">
              Review<span className="text-purple-600">Booster</span>
            </span>
          </div>
          <p className="text-gray-400 text-sm">Verify your email</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <button
            type="button"
            onClick={function() { router.push('/signup'); }}
            className="text-gray-400 hover:text-gray-600 text-sm mb-4 -ml-1 transition-colors"
          >
            {'\u2190'}
          </button>

          <p className="text-gray-600 text-sm mb-5">
            {'We sent a 6-digit code to '}<span className="font-semibold text-gray-900">{pending.email}</span>{'. Enter it below to finish creating your account.'}
          </p>

          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm flex items-start gap-2">
              <span className="mt-0.5 shrink-0">{'\u26A0'}</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-center text-2xl tracking-[0.5em] font-bold focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition-colors duration-150"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2">
              {loading ? (
                <>
                  <span className="spinner w-4 h-4" />
                  Verifying...
                </>
              ) : 'Create Account'}
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || otpSending}
              className="w-full text-center text-xs font-semibold text-purple-600 hover:text-purple-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors duration-150 pt-1">
              {resendCooldown > 0 ? 'Resend code in ' + resendCooldown + 's' : (otpSending ? 'Sending...' : 'Resend code')}
            </button>
          </form>
        </div>

        <p className="text-center mt-6">
          <span className="text-gray-300 text-xs">Powered by </span>
          <span className="text-gray-500 text-xs font-semibold">Adcend</span>
        </p>
      </div>
    </div>
  );
}
