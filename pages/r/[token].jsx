/**
 * pages/r/[token].jsx
 * Customer-facing review page — Phase 2 redesign.
 * PUBLIC — no auth required.
 * Session 14 — desktop optimised, purple SVG stars via StarRating.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import StarRating from '../../components/StarRating';
import api from '../../lib/api';

const SCREEN = {
  LOADING:       'loading',
  INVALID:       'invalid',
  RATE:          'rate',
  FEEDBACK:      'feedback',
  THANK_PUBLIC:  'thank_pub',
  THANK_PRIVATE: 'thank_priv',
  ALREADY_DONE:  'done',
};

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
      <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-xl mb-4">
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
      <h1 className="text-white font-bold text-xl mb-1 text-center">{business.name}</h1>
      <p className="text-center" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
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
        setScreen(SCREEN.RATE);
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

  var handleRatingSelect = function (r) {
    setRating(r);
    if (r >= 4) {
      submitReview(r, '');
    } else {
      setScreen(SCREEN.FEEDBACK);
    }
  };

  var submitReview = async function (r, text) {
    setSubmitting(true);
    try {
      await api.post('/r/' + token + '/submit', { rating: r, feedback: text });
      if (r >= 4) {
        setScreen(SCREEN.THANK_PUBLIC);
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

  return (
    <>
      <Head>
        <title>{business ? ('Rate ' + business.name) : 'ReviewBooster'}</title>
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

          {screen === SCREEN.RATE && business && (
            <>
              <BusinessHeader business={business} />
              <div className="px-5 pb-8" style={{ marginTop: '-32px' }}>
                <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
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
                    <StarRating value={rating} onChange={handleRatingSelect} size="lg" />
                  )}
                  {!submitting && (
                    <p className="text-xs mt-5" style={{ color: '#D1D5DB' }}>
                      {'Tap a star to continue \uD83D\uDC47'}
                    </p>
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
                <div className="bg-white rounded-2xl shadow-lg p-5 text-center mb-5">
                  <h2 className="font-bold text-gray-900 mb-1" style={{ fontSize: '15px' }}>
                    How was your experience?
                  </h2>
                  <p className="text-xs text-gray-400 mb-4">Please rate your experience with us</p>
                  <StarRating value={rating} readOnly size="lg" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1 px-1" style={{ fontSize: '15px' }}>
                  {"Great! We\u2019d love your review"}
                </h3>
                <p className="text-xs text-gray-400 mb-3 px-1">
                  If you had a great experience, please share it on Google.
                </p>
                <a href={business.google_review_url} target="_blank" rel="noopener noreferrer"
                  className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 mb-5 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <GoogleLogo />
                  </div>
                  <span className="font-semibold text-gray-800 text-sm flex-1 text-left">
                    Review us on Google
                  </span>
                  <ChevronRight />
                </a>
                <h3 className="font-bold text-gray-900 mb-1 px-1" style={{ fontSize: '15px' }}>
                  Not great?
                </h3>
                <p className="text-xs text-gray-400 mb-3 px-1">
                  Let us know how we can improve your experience.
                </p>
                <button
                  onClick={function () { setScreen(SCREEN.FEEDBACK); }}
                  className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 w-full mb-6 hover:bg-gray-50 transition-colors"
                >
                  <ChatIcon />
                  <span className="font-semibold text-gray-800 text-sm flex-1 text-left">
                    Send Feedback Privately
                  </span>
                  <ChevronRight />
                </button>
                <p className="text-center text-sm text-gray-400 mb-1">
                  {"Thank you for helping us improve! \uD83D\uDE4C"}
                </p>
              </div>
              <p className="text-center pb-8" style={{ fontSize: '11px', color: '#D1D5DB' }}>
                Powered by ReviewBooster
              </p>
            </>
          )}

          {screen === SCREEN.FEEDBACK && business && (
            <>
              <BusinessHeader business={business} />
              <div className="px-5 pb-8" style={{ marginTop: '-32px' }}>
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h2 className="font-bold text-gray-900 mb-1" style={{ fontSize: '17px' }}>
                    {"We\u2019re sorry to hear that"}
                  </h2>
                  <p className="text-sm text-gray-400 mb-4">
                    {'Your feedback goes directly to the team at ' + business.name + '. We\u2019ll work to make it right.'}
                  </p>
                  <div className="flex justify-center mb-5">
                    <StarRating value={rating} readOnly size="md" />
                  </div>
                  <form onSubmit={handleFeedbackSubmit}>
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
                    <button
                      type="button"
                      onClick={function () { setScreen(SCREEN.RATE); }}
                      className="w-full mt-3 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {'\u2190 Change my rating'}
                    </button>
                  </form>
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