﻿/**
 * pages/signup.jsx
 * Signup -- Welcome + Account Details only. Creates the account and logs
 * the owner in immediately (no approval wait), then hands off to
 * /onboarding for the rest of the setup wizard.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import SEO from '../components/SEO';

export default function SignupPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1); // 1 = Welcome, 2 = Account Details

  const [ownerName,       setOwnerName]       = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [showConfirmPw,   setShowConfirmPw]   = useState(false);
  const [error,           setError]           = useState('');
  const [loading,         setLoading]         = useState(false);

  // Engine B -- an incoming ?ref=CODE gets validated so we can show who
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
      .catch(function() { /* invalid/expired code -- just proceed without the banner */ });
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
    setLoading(true);
    try {
      const payload = {
        // Business name/type are collected on the next screen (/onboarding);
        // the backend still requires *something* here, so we send a
        // placeholder the owner will immediately overwrite there.
        business_name:    ownerName.trim() + "'s Business",
        business_type:    'other',
        business_type_other: 'General',
        owner_name:       ownerName,
        email,
        password,
        confirm_password: confirmPassword,
      };
      if (refCode) payload.ref = refCode;
      const res = await api.post('/auth/signup', payload);
      login(res.data);
      router.replace('/onboarding');
    } catch (err) {
      setError(err.response?.data?.error || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-start sm:items-center justify-center p-4 py-8">
      <SEO title="Sign Up" description="Create your free ReviewBooster account and start collecting Google reviews today." path="/signup" />

      <div className="relative w-full max-w-sm">

        {step === 1 ? (
          <>
            {/* Welcome screen */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <div className="inline-flex items-center gap-2 mb-3">
                <span className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-xl shrink-0">{'\u2B50'}</span>
                <span className="text-gray-900 font-bold text-2xl tracking-tight text-left">
                  Review<span className="text-purple-600">Booster</span>
                  <span className="block text-gray-400 text-[11px] font-normal tracking-normal">More Reviews. More Customers.</span>
                </span>
              </div>

              {referrerInfo && (
                <div className="my-5 p-3.5 rounded-lg bg-purple-50 border border-purple-100 text-sm flex items-start gap-2 text-left">
                  <span className="mt-0.5 shrink-0">{'\uD83C\uDF81'}</span>
                  <span className="text-gray-600">
                    {'Referred by '}<span className="font-semibold text-gray-900">{referrerInfo.referrer_name}</span>
                    {referrerInfo.referred_discount_pct > 0
                      ? ' \u2014 you\u2019ll get ' + referrerInfo.referred_discount_pct + '% off your first plan.'
                      : '.'}
                  </span>
                </div>
              )}

              <h1 className="text-gray-900 text-xl font-bold mt-5 mb-2">Get more reviews.<br />Grow your business.</h1>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                {'ReviewBooster helps you collect real customer feedback, boost your Google ratings, and turn happy customers into loyal fans.'}
              </p>

              <button
                type="button"
                onClick={function() { setStep(2); }}
                className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 active:scale-[0.98] transition-all duration-150"
              >
                Get Started
              </button>
            </div>

            <p className="text-center text-gray-400 text-xs mt-6">
              Already have an account?{' '}
              <a href="/login" className="text-purple-600 hover:text-purple-700 font-semibold transition-colors duration-150">Sign in</a>
            </p>
          </>
        ) : (
          <>
            {/* Account Details screen */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-3">
                <span className="text-3xl">{'\u2B50'}</span>
                <span className="text-gray-900 font-bold text-2xl tracking-tight">
                  Review<span className="text-purple-600">Booster</span>
                </span>
              </div>
              <p className="text-gray-400 text-sm">Create your account</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <button
                type="button"
                onClick={function() { setStep(1); }}
                className="text-gray-400 hover:text-gray-600 text-sm mb-4 -ml-1 transition-colors"
              >
                {'\u2190'}
              </button>

              {error && (
                <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm flex items-start gap-2">
                  <span className="mt-0.5 shrink-0">{'\u26A0'}</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Name</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Rahul Sharma"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition-colors duration-150"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition-colors duration-150"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition-colors duration-150"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(function(v) { return !v; })}
                      aria-label="Toggle password visibility"
                      className="absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400 hover:text-gray-600 transition-colors duration-150">
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

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition-colors duration-150"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(function(v) { return !v; })}
                      aria-label="Toggle confirm password visibility"
                      className="absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400 hover:text-gray-600 transition-colors duration-150">
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2">
                  {loading ? (
                    <>
                      <span className="spinner w-4 h-4" />
                      Creating account...
                    </>
                  ) : 'Create Account'}
                </button>
              </form>
            </div>
          </>
        )}

        <p className="text-center mt-6">
          <span className="text-gray-300 text-xs">Powered by </span>
          <span className="text-gray-500 text-xs font-semibold">Adcend</span>
        </p>

      </div>
    </div>
  );
}