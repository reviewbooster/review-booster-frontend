/**
 * pages/r/[token].jsx
 * Customer-facing review page â€” Phase 2 redesign.
 * PUBLIC â€” no auth required.
 * Session 14 â€” desktop optimised, purple SVG stars via StarRating.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import StarRating from '../../components/StarRating';
import api from '../../lib/api';

const SCREEN = {
  LOADING:       'loading',
  INVALID:       'invalid',
  IDENTIFY:      'identify',
  RATE:          'rate',
  FEEDBACK:      'feedback',
  THANK_PUBLIC:  'thank_pub',
  THANK_PRIVATE: 'thank_priv',
  ALREADY_DONE:  'done',
};

const QUICK_TAGS = [
  { label: 'Staff',       phrase: 'Staff was rude' },
  { label: 'Wait Time',   phrase: 'Had to wait too long' },
  { label: 'Pricing',     phrase: 'Felt overpriced' },
  { label: 'Cleanliness', phrase: "Place wasn't clean" },
  { label: 'Quality',     phrase: 'Quality was poor' },
];

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function ChatIcon() {
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#F3E8FF' }}>
      <svg width="15" height="15" fill="none" stroke="#7C3AED" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    </div>
  );
}

function ChevronRight() {
  return (
    <svg width="16" height="16" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  );
}

function BusinessHeader({ business }) {
  return (
    <div
      className="pt-12 pb-16 flex flex-col items-center px-5"
      style={{ background: 'linear-gradient(135deg,#7C3AED 0%,#4F46E5 100%)' }}
    >
      <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-xl mb-4 animate-pop-in">
        {business.brand_logo_url ? (
          <img
            src={business.brand_logo_url}
            alt={business.name}
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <span className="text-3xl font-bold" style={{ color: '#7C3AED' }}>
            {business.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <h1 className="text-white font-bold text-xl mb-1 text-center animate-fade-in" style={{ animationDelay: '150ms' }}>{business.name}</h1>
      <p className="text-center animate-fade-in" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', animationDelay: '250ms' }}>
        Your feedback helps us improve
      </p>
    </div>
  );
}

export default function PublicReviewPage() {
  const router = useRouter();
  const { token } = router.query;

  const [screen,       setScreen]       = useState(SCREEN.LOADING);
  const [business,     setBusiness]     = useState(null);
  const [rating,       setRating]       = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [idName,       setIdName]       = useState('');
  const [idCountryCode, setIdCountryCode] = useState('+91');
  const [idPhone,      setIdPhone]      = useState('');
  const [idSubmitting, setIdSubmitting] = useState(false);
  const [idError,      setIdError]      = useState('');

  useEffect(function () {
    if (!token) return;
    var load = async function () {
      try {
        var res = await api.get('/r/' + token);
        setBusiness({
          name:              res.data.data.business_name,
          google_review_url: res.data.data.google_review_url,
          brand_logo_url:    res.data.data.logo_url || null,
        });
        setScreen(res.data.data.customer_name ? SCREEN.RATE : SCREEN.IDENTIFY);
      } catch (err) {
        if (err.response && err.response.status === 410) {
          setScreen(SCREEN.ALREADY_DONE);
        } else {
          setScreen(SCREEN.INVALID);
        }
      }
    };
    load();
  }, [token]);

  var handleIdentifySubmit = async function (e) {
    e.preventDefault();
    if (!idName.trim()) {
      setIdError('Please enter your name.');
      return;
    }
    setIdSubmitting(true);
    setIdError('');
    var digits = idPhone.trim().replace(/\D/g, '');
    var fullPhone = digits ? idCountryCode + digits : '';
    try {
      await api.post('/r/' + token + '/identify', { name: idName.trim(), phone: fullPhone });
      setScreen(SCREEN.RATE);
    } catch (err) {
      setIdError(err.response?.data?.error || 'Something went wrong. You can still continue below.');
    } finally {
      setIdSubmitting(false);
    }
  };

  var handleIdentifySkip = function () {
    setScreen(SCREEN.RATE);
  };

  var handleRatingSelect = function (r) {
    setRating(r);
  };

  var handleContinue = function () {
    submitReview(rating, '');
  };

  var submitReview = async function (r, text) {
    setSubmitting(true);
    try {
      await api.post('/r/' + token + '/submit', { rating: r, feedback: text });
      if (r >= 4) {
        if (business && business.google_review_url) {
          window.location.href = business.google_review_url;
        } else {
          setScreen(SCREEN.THANK_PUBLIC);
        }
      } else {
        setScreen(SCREEN.THANK_PRIVATE);
      }
    } catch (err) {
      if (err.response && err.response.status === 410) {
        setScreen(SCREEN.ALREADY_DONE);
      } else {
        setScreen(SCREEN.RATE);
      }
    } finally {
      setSubmitting(false);
    }
  };

  var handleFeedbackSubmit = function (e) {
    e.preventDefault();
    submitReview(rating, feedbackText);
  };

  var handleQuickTag = function (phrase) {
    setFeedbackText(function (prev) {
      if (prev.includes(phrase)) return prev;
      var trimmed = prev.trim();
      if (!trimmed) return phrase + '. ';
      var sep = /[.!?]\s*$/.test(trimmed) ? ' ' : '. ';
      return trimmed + sep + phrase + '. ';
    });
  };

  return (
    <>
      <Head>
        <title>{business ? ('Rate ' + business.name) : 'ReviewBooster'}</title>
        <meta property="og:title" content={business ? ("Rate " + business.name) : "ReviewBooster"} />
        <meta property="og:description" content={business ? ("Share your experience with " + business.name + " -- it only takes a minute.") : "Share your experience -- it only takes a minute."} />
        <meta property="og:image" content={business && business.brand_logo_url ? business.brand_logo_url : "https://reviewbooster.adcend.in/og-image.jpg"} />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-[#F8F7FF] md:flex md:items-center md:justify-center md:py-10">
        <div className="w-full md:max-w-[440px] md:rounded-[28px] md:overflow-hidden md:shadow-2xl bg-[#F8F7FF]">

          {screen === SCREEN.LOADING && (
            <div
              className="flex items-center justify-center py-32"
              style={{ background: 'linear-gradient(135deg,#7C3AED 0%,#4F46E5 100%)' }}
            >
              <div className="flex flex-col items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full border-4 animate-spin"
                  style={{ borderColor: 'rgba(255,255,255,0.25)', borderTopColor: '#ffffff' }}
                />
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>{'Loading\u2026'}</p>
              </div>
            </div>
          )}

          {screen === SCREEN.INVALID && (
            <div className="flex items-center justify-center p-8 bg-white" style={{ minHeight: '320px' }}>
              <div className="text-center">
                <p className="text-5xl mb-4">&#128279;</p>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Link not found</h1>
                <p className="text-sm text-gray-500">
                  This review link may have expired or is invalid. Please contact the business for a new link.
                </p>
              </div>
            </div>
          )}

          {screen === SCREEN.ALREADY_DONE && (
            <div className="flex items-center justify-center p-8 bg-white" style={{ minHeight: '320px' }}>
              <div className="text-center">
                <p className="text-5xl mb-4">&#9989;</p>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Already submitted!</h1>
                <p className="text-sm text-gray-500">
                  {"You've already shared your feedback. Thank you" +
                    (business && business.name ? ' for visiting ' + business.name : '') + '!'}
                </p>
              </div>
            </div>
          )}

          {screen === SCREEN.IDENTIFY && business && (
            <>
              <BusinessHeader business={business} />
              <div className="bg-white rounded-t-3xl -mt-6 px-6 pt-8 pb-8 relative">
                <h2 className="text-lg font-bold text-gray-900 text-center mb-6">Before you rate us...</h2>
                <form onSubmit={handleIdentifySubmit}>
                  {idError && (
                    <div className="bg-red-50 text-red-500 text-xs rounded-lg px-3 py-2 mb-4">{idError}</div>
                  )}
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Your name"
                      value={idName}
                      onChange={function (e) { setIdName(e.target.value); }}
                      className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                  <div className="mb-5 flex gap-2">
                    <select
                      value={idCountryCode}
                      onChange={function (e) { setIdCountryCode(e.target.value); }}
                      className="bg-gray-100 rounded-xl px-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-purple-200 shrink-0"
                    >
                      <option value="+91">{'\uD83C\uDDEE\uD83C\uDDF3 +91'}</option>
                      <option value="+1">{'\uD83C\uDDFA\uD83C\uDDF8 +1'}</option>
                      <option value="+44">{'\uD83C\uDDEC\uD83C\uDDE7 +44'}</option>
                      <option value="+971">{'\uD83C\uDDE6\uD83C\uDDEA +971'}</option>
                      <option value="+65">{'\uD83C\uDDF8\uD83C\uDDEC +65'}</option>
                      <option value="+61">{'\uD83C\uDDE6\uD83C\uDDFA +61'}</option>
                      <option value="+92">{'\uD83C\uDDF5\uD83C\uDDF0 +92'}</option>
                      <option value="+880">{'\uD83C\uDDE7\uD83C\uDDE9 +880'}</option>
                      <option value="+94">{'\uD83C\uDDF1\uD83C\uDDF0 +94'}</option>
                      <option value="+977">{'\uD83C\uDDF3\uD83C\uDDF5 +977'}</option>
                    </select>
                    <input
                      type="tel"
                      placeholder="Phone number"
                      value={idPhone}
                      onChange={function (e) { setIdPhone(e.target.value); }}
                      className="flex-1 min-w-0 bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={idSubmitting}
                    className="w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#7C3AED' }}
                  >
                    {idSubmitting ? 'Please wait\u2026' : 'Continue'}
                  </button>
                  <button
                    type="button"
                    onClick={handleIdentifySkip}
                    disabled={idSubmitting}
                    className="w-full py-3 mt-2 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Skip
                  </button>
                </form>
              </div>
            </>
          )}

          {screen === SCREEN.RATE && business && (
            <>
              <BusinessHeader business={business} />
              <div className="px-5 pb-8" style={{ marginTop: '-32px' }}>
                <div className="bg-white rounded-2xl shadow-lg p-6 text-center animate-slide-up" style={{ animationDelay: '150ms' }}>
                  <h2 className="font-bold text-gray-900 mb-1" style={{ fontSize: '17px' }}>
                    How was your experience?
                  </h2>
                  <p className="text-sm text-gray-400 mb-8">Please rate your experience with us</p>
                  {submitting ? (
                    <div className="flex justify-center py-4">
                      <div
                        className="w-8 h-8 rounded-full border-4 animate-spin"
                        style={{ borderColor: '#E9D5FF', borderTopColor: '#7C3AED' }}
                      />
                    </div>
                  ) : (
                    <>
                      <StarRating value={rating} onChange={handleRatingSelect} size="lg" />
                      <p className="text-xs mt-5" style={{ color: '#D1D5DB' }}>
                        {rating > 0 ? 'Tap a different star to change it' : 'Tap a star to rate your experience'}
                      </p>

                      {rating >= 4 && (
                        <button
                          type="button"
                          onClick={handleContinue}
                          className="w-full mt-5 py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90"
                          style={{ backgroundColor: '#7C3AED' }}
                        >
                          Continue
                        </button>
                      )}

                      {rating >= 1 && rating <= 3 && (
                        <div className="text-left mt-6">
                          <p className="text-sm text-gray-400 mb-4">
                            {'Your feedback goes directly to the team at ' + business.name + '. We\u2019ll work to make it right.'}
                          </p>
                          <form onSubmit={handleFeedbackSubmit}>
                            <p className="text-xs font-semibold text-gray-400 mb-2">
                              {'What went wrong? Tap to add \u2014 optional'}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {QUICK_TAGS.map(function (t) {
                                return (
                                  <button
                                    key={t.label}
                                    type="button"
                                    onClick={function () { handleQuickTag(t.phrase); }}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                                  >
                                    {t.label}
                                  </button>
                                );
                              })}
                            </div>
                            <textarea
                              className="input resize-none h-28 mb-1"
                              placeholder={"Tell us what went wrong\u2026"}
                              value={feedbackText}
                              onChange={function (e) { setFeedbackText(e.target.value); }}
                              maxLength={1000}
                            />
                            <p className="text-right text-xs text-gray-300 mb-5">
                              {feedbackText.length + '/1000'}
                            </p>
                            <button
                              type="submit"
                              disabled={submitting}
                              className="w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                              style={{ backgroundColor: '#7C3AED' }}
                            >
                              {submitting
                                ? <><span className="spinner" />{' Sending\u2026'}</>
                                : 'Send Feedback'
                              }
                            </button>
                            <a href={business.google_review_url || '#'} target="_blank" rel="noopener noreferrer"
                              className="w-full mt-3 py-3 rounded-xl border border-gray-200 flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                              <GoogleLogo />
                              {'Leave us a review on Google'}
                            </a>
                            <p className="text-center text-[11px] text-gray-300 mt-2">
                              {"It's your choice \u2014 send feedback, post publicly, or both."}
                            </p>
                          </form>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <p className="text-center pb-8" style={{ fontSize: '11px', color: '#D1D5DB' }}>
                Powered by ReviewBooster
              </p>
            </>
          )}

          {screen === SCREEN.THANK_PUBLIC && business && (
            <>
              <BusinessHeader business={business} />
              <div className="px-5 pb-8" style={{ marginTop: '-32px' }}>
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                  <p className="text-5xl mb-4">{'\uD83C\uDF89'}</p>
                  <h1 className="text-xl font-bold text-gray-900 mb-2">
                    Thanks for the great rating!
                  </h1>
                  <p className="text-sm text-gray-500">
                    {'We\u2019ve let the ' + business.name + ' team know. We appreciate you taking the time.'}
                  </p>
                </div>
              </div>
              <p className="text-center pb-8" style={{ fontSize: '11px', color: '#D1D5DB' }}>
                Powered by ReviewBooster
              </p>
            </>
          )}

          {screen === SCREEN.THANK_PRIVATE && business && (
            <>
              <BusinessHeader business={business} />
              <div className="px-5 pb-8" style={{ marginTop: '-32px' }}>
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                  <p className="text-5xl mb-4">{'\uD83D\uDE4F'}</p>
                  <h1 className="text-xl font-bold text-gray-900 mb-2">
                    Thank you for your honesty
                  </h1>
                  <p className="text-sm text-gray-500">
                    {'Your feedback has been shared privately with the ' + business.name +
                      ' team. We take every comment seriously and will work to improve.'}
                  </p>
                </div>
              </div>
              <p className="text-center pb-8" style={{ fontSize: '11px', color: '#D1D5DB' }}>
                Powered by ReviewBooster
              </p>
            </>
          )}

        </div>
      </div>
    </>
  );
}
