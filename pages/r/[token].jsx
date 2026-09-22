/**
 * pages/r/[token].jsx
 * Customer-facing review page.
 * PUBLIC -- no auth required.
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import StarRating from '../../components/StarRating';
import api from '../../lib/api';
import { getExperienceChips, generateReviewDraft, getIssueGroups, findIssue } from '../../lib/reviewDraftPrompts';

const SCREEN = {
  LOADING:       'loading',
  INVALID:       'invalid',
  IDENTIFY:      'identify',
  RATE:          'rate',
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

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back"
      className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors z-10"
    >
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
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
  const [submitting,   setSubmitting]   = useState(false);
  const [idName,       setIdName]       = useState('');
  const [idCountryCode, setIdCountryCode] = useState('+91');
  const [idPhone,      setIdPhone]      = useState('');
  const [idSubmitting, setIdSubmitting] = useState(false);
  const [idError,      setIdError]      = useState('');

  // -- 4-5 star (public) flow --------------------------------------------
  const [draftScreen,    setDraftScreen]    = useState(false);
  const [selectedChips,  setSelectedChips]  = useState([]);
  const [draftText,      setDraftText]      = useState('');
  const [draftCopied,    setDraftCopied]    = useState(false);
  const [usedDraft,      setUsedDraft]      = useState(false);
  const draftTextareaRef = useRef(null);

  // -- 1-3 star (private feedback) flow -- two screens: pick an issue,
  // then an optional issue-specific follow-up + free text. -----------------
  const [issueScreen,         setIssueScreen]         = useState(null); // null | 'A' | 'B'
  const [selectedIssueKeys,   setSelectedIssueKeys]   = useState([]);
  const [issueFollowUpAnswers, setIssueFollowUpAnswers] = useState({});
  const [feedbackText,        setFeedbackText]        = useState('');
  const [requestFollowUp,     setRequestFollowUp]     = useState(false);

  useEffect(function () {
    if (!token) return;
    var load = async function () {
      try {
        var res = await api.get('/r/' + token);
        setBusiness({
          name:              res.data.data.business_name,
          type:              res.data.data.business_type || null,
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

  // Tapping a star commits to a path immediately -- both ranges skip the
  // extra "Continue" tap and go straight into their respective screen.
  var handleRatingSelect = function (r) {
    var isDifferentRating = r !== rating;
    setRating(r);
    if (r >= 1 && r <= 3) {
      if (isDifferentRating) {
        setSelectedIssueKeys([]);
        setIssueFollowUpAnswers({});
        setFeedbackText('');
      }
      setIssueScreen('A');
    } else if (r >= 4) {
      setDraftScreen(true);
    }
  };

  // -- 4-5 star handlers ---------------------------------------------------

  var toggleChip = function (key) {
    setSelectedChips(function (prev) {
      return prev.indexOf(key) !== -1 ? prev.filter(function (k) { return k !== key; }) : prev.concat(key);
    });
  };

  var regenerateDraft = function (chips) {
    if (chips.length === 0) {
      setDraftText('');
      return;
    }
    var draft = generateReviewDraft({
      businessName: business.name,
      businessType: business.type,
      selectedChipKeys: chips,
      customerWords: '',
    });
    setDraftText(draft);
  };

  // Draft regenerates automatically whenever the chip selection changes --
  // no separate "Create my draft" tap needed.
  useEffect(function () {
    if (!business) return;
    regenerateDraft(selectedChips);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChips, business]);

  var handleEditDraft = function () {
    if (draftTextareaRef.current) draftTextareaRef.current.focus();
  };

  // Genuinely deterministic -- keeps roughly the first half of the
  // sentences, or hard-trims at a word boundary if there aren't clean
  // sentence breaks to work with. Not AI, just real trimming logic.
  var handleMakeShorter = function () {
    if (!draftText) return;
    var trimmed = draftText.trim();
    var sentences = trimmed.match(/[^.!?]+[.!?]+/g);
    var shortened;
    if (sentences && sentences.length > 1) {
      shortened = sentences.slice(0, Math.max(1, Math.ceil(sentences.length / 2))).join(' ').trim();
    } else {
      shortened = trimmed;
    }
    if (shortened.length >= trimmed.length && trimmed.length > 100) {
      shortened = trimmed.slice(0, 100).replace(/\s+\S*$/, '') + '...';
    }
    setDraftText(shortened);
  };

  // navigator.clipboard.writeText only works while the document still has
  // focus. Falls back to the older execCommand technique for contexts where
  // the modern Clipboard API isn't available at all.
  var copyTextToClipboard = function (text) {
    // execCommand is old and deprecated, but it's NOT gated behind the
    // Permissions API at all -- it works by directly selecting text in a
    // hidden textarea, so it never triggers the "allow clipboard access?"
    // system prompt that navigator.clipboard.writeText sometimes shows on
    // Android/embedded browsers. Try it first; fall back to the modern API
    // only if execCommand genuinely isn't supported.
    var legacyCopy = function () {
      return new Promise(function (resolve, reject) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
          var ok = document.execCommand('copy');
          document.body.removeChild(textarea);
          if (ok) { resolve(); } else { reject(new Error('execCommand failed')); }
        } catch (err) {
          document.body.removeChild(textarea);
          reject(err);
        }
      });
    };

    return legacyCopy().catch(function () {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
      }
      return Promise.reject(new Error('No clipboard method available'));
    });
  };

  var handleCopyDraft = function () {
    setUsedDraft(true);
    // Copy FIRST, while the document still has focus -- window.open() right
    // after this shifts focus to the new tab, and the Clipboard API silently
    // fails if focus has already moved by the time it's called.
    if (draftText) {
      copyTextToClipboard(draftText).then(function () { setDraftCopied(true); }).catch(function () {});
    }
    // Still synchronous and immediate, so mobile browsers still treat this
    // as a direct response to the user's tap rather than a blocked popup.
    if (business.google_review_url) {
      window.open(business.google_review_url, '_blank', 'noopener,noreferrer');
    }
    var chipLabels = getExperienceChips(business.type)
      .filter(function (c) { return selectedChips.indexOf(c.key) !== -1; })
      .map(function (c) { return c.label; });
    submitReview(rating, draftText, chipLabels);
  };

  var handleSkipToGoogle = function () {
    setUsedDraft(false);
    if (business.google_review_url) {
      window.open(business.google_review_url, '_blank', 'noopener,noreferrer');
    }
    var chipLabels = getExperienceChips(business.type)
      .filter(function (c) { return selectedChips.indexOf(c.key) !== -1; })
      .map(function (c) { return c.label; });
    submitReview(rating, '', chipLabels);
  };

  // -- 1-3 star handlers ----------------------------------------------------

  var handleSelectIssue = function (key) {
    setSelectedIssueKeys(function (prev) {
      return prev.indexOf(key) !== -1 ? prev.filter(function (k) { return k !== key; }) : prev.concat(key);
    });
  };

  var handleIssueContinue = function () {
    if (selectedIssueKeys.length === 0) return;
    setIssueScreen('B');
  };

  var getSelectedIssues = function () {
    return selectedIssueKeys.map(function (key) { return findIssue(business.type, key); }).filter(Boolean);
  };

  var buildFinalFeedbackText = function (issues) {
    var parts = [];
    issues.forEach(function (issue) {
      parts.push(issue.phrase + '.');
      var answers = issueFollowUpAnswers[issue.key] || [];
      if (issue.followUp && answers.length > 0) {
        parts.push(issue.followUp.question + ' ' + answers.join(', ') + '.');
      }
    });
    if (feedbackText.trim()) parts.push(feedbackText.trim());
    return parts.join(' ');
  };

  var handleFeedbackSubmit = function (e) {
    e.preventDefault();
    var issues = getSelectedIssues();
    var finalText = buildFinalFeedbackText(issues);
    submitReview(rating, finalText, issues.map(function (i) { return i.label; }), requestFollowUp);
  };

  // -- shared submit --------------------------------------------------------

  var submitReview = async function (r, text, tags, followUp) {
    setSubmitting(true);
    try {
      await api.post('/r/' + token + '/submit', { rating: r, feedback: text, tags: tags || [], request_followup: !!followUp });
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

  var headerTitle = 'How was your experience?';
  var headerSubtitle = 'Please rate your experience with us';
  if (draftScreen) {
    headerTitle = 'What stood out about your visit?';
    headerSubtitle = 'Pick what applies \u2014 totally optional';
  } else if (issueScreen === 'A') {
    headerTitle = 'What could we improve?';
    headerSubtitle = 'Choose the issue that best matches your experience.';
  } else if (issueScreen === 'B') {
    headerTitle = 'Tell us a little more';
    headerSubtitle = selectedIssueKeys.length > 0
      ? ('You selected: ' + selectedIssueKeys.map(function (k) { var i = findIssue(business ? business.type : null, k); return i ? i.label : ''; }).filter(Boolean).join(', '))
      : '';
  }

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
                <h2 className="text-lg font-bold text-gray-900 text-center mb-2">Before you rate us...</h2>
                <p className="text-xs text-gray-400 text-center mb-6">
                  {'We use this to save your visit and follow up if needed \u2014 never shared or sold.'}
                </p>
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
                      className="w-full bg-gray-100 rounded-xl px-4 py-3 text-base sm:text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                  <div className="mb-5 flex gap-2">
                    <select
                      value={idCountryCode}
                      onChange={function (e) { setIdCountryCode(e.target.value); }}
                      className="bg-gray-100 rounded-xl px-2 text-base sm:text-sm text-gray-700 outline-none focus:ring-2 focus:ring-purple-200 shrink-0"
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
                      className="flex-1 min-w-0 bg-gray-100 rounded-xl px-4 py-3 text-base sm:text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-200"
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
                <div className="relative bg-white rounded-2xl shadow-lg p-6 text-center animate-slide-up" style={{ animationDelay: '150ms' }}>
                  {draftScreen && <BackButton onClick={function () { setDraftScreen(false); }} />}
                  {issueScreen === 'A' && <BackButton onClick={function () { setIssueScreen(null); }} />}
                  {issueScreen === 'B' && <BackButton onClick={function () { setIssueScreen('A'); }} />}
                  <h2 className="font-bold text-gray-900 mb-1" style={{ fontSize: '17px' }}>
                    {headerTitle}
                  </h2>
                  <p className="text-sm text-gray-400 mb-6">
                    {headerSubtitle}
                  </p>

                  {submitting ? (
                    <div className="flex justify-center py-4">
                      <div
                        className="w-8 h-8 rounded-full border-4 animate-spin"
                        style={{ borderColor: '#E9D5FF', borderTopColor: '#7C3AED' }}
                      />
                    </div>

                  ) : draftScreen ? (
                    /* ---------- 4-5 star: experience chips + live draft ---------- */
                    <div className="text-left">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 text-center">
                        {'What stood out?'}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {getExperienceChips(business.type).map(function (c) {
                          var isSelected = selectedChips.indexOf(c.key) !== -1;
                          return (
                            <button
                              key={c.key}
                              type="button"
                              onClick={function () { toggleChip(c.key); }}
                              className={'text-sm font-semibold py-3 px-2 rounded-xl border text-center transition-colors ' + (isSelected ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600')}
                            >
                              {c.label}
                            </button>
                          );
                        })}
                      </div>

                      {draftText && (
                        <>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs font-semibold text-gray-500">{'Your review draft'}</p>
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={function () { regenerateDraft(selectedChips); }}
                                className="text-[11px] font-semibold text-purple-600 hover:text-purple-700"
                              >
                                {'\u21bb Shuffle'}
                              </button>
                              <button
                                type="button"
                                onClick={handleMakeShorter}
                                className="text-[11px] font-semibold text-purple-600 hover:text-purple-700"
                              >
                                {'Make it shorter'}
                              </button>
                            </div>
                          </div>
                          <textarea
                            ref={draftTextareaRef}
                            className="input resize-none h-24 mb-1 text-base sm:text-sm"
                            value={draftText}
                            onChange={function (e) { setDraftText(e.target.value); }}
                            maxLength={600}
                          />
                          <p className="text-[10px] text-gray-300 mb-3">
                            {'AI draft \u2014 review and edit for accuracy.'}
                          </p>
                          <div className="flex gap-2 mb-1">
                            <button
                              type="button"
                              onClick={handleCopyDraft}
                              disabled={submitting}
                              className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                              style={{ backgroundColor: '#7C3AED' }}
                            >
                              <GoogleLogo />
                              {'Copy draft'}
                            </button>
                            <button
                              type="button"
                              onClick={handleEditDraft}
                              className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              Edit
                            </button>
                          </div>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={handleSkipToGoogle}
                        disabled={submitting}
                        className="w-full mt-2 py-2 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                      >
                        {'Skip \u2014 just take me to Google'}
                      </button>
                      <p className="text-center text-[11px] text-gray-300 mt-1">
                        {'This is just a starting point \u2014 edit it to match your own experience before posting.'}
                      </p>
                    </div>

                  ) : issueScreen === 'A' ? (
                    /* ---------- 1-3 star, screen A: pick issue(s) ---------- */
                    <div className="text-left">
                      {getIssueGroups(business.type).map(function (g) {
                        return (
                          <div key={g.group} className="mb-4">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{g.group}</p>
                            <div className="grid grid-cols-2 gap-2">
                              {g.issues.map(function (issue) {
                                var isSel = selectedIssueKeys.indexOf(issue.key) !== -1;
                                return (
                                  <button
                                    key={issue.key}
                                    type="button"
                                    onClick={function () { handleSelectIssue(issue.key); }}
                                    className={'text-sm font-semibold py-3 px-2 rounded-xl border text-center transition-colors ' + (isSel ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600')}
                                  >
                                    {issue.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={handleIssueContinue}
                        disabled={selectedIssueKeys.length === 0}
                        className="w-full mt-1 py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-40"
                        style={{ backgroundColor: '#7C3AED' }}
                      >
                        Continue
                      </button>
                    </div>

                  ) : issueScreen === 'B' ? (
                    /* ---------- 1-3 star, screen B: optional follow-up(s) ---------- */
                    <form onSubmit={handleFeedbackSubmit} className="text-left">
                      {getSelectedIssues().filter(function (issue) { return issue.followUp; }).map(function (issue) {
                        return (
                          <div key={issue.key} className="mb-4">
                            <p className="text-sm font-semibold text-gray-700 mb-2">{issue.followUp.question}</p>
                            {issue.followUp.options && (
                              <div className="flex flex-wrap gap-2">
                                {issue.followUp.options.map(function (opt) {
                                  var currentAnswers = issueFollowUpAnswers[issue.key] || [];
                                  var isSel = currentAnswers.indexOf(opt) !== -1;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={function () {
                                        setIssueFollowUpAnswers(function (prev) {
                                          var next = Object.assign({}, prev);
                                          var current = next[issue.key] || [];
                                          next[issue.key] = current.indexOf(opt) !== -1
                                            ? current.filter(function (o) { return o !== opt; })
                                            : current.concat(opt);
                                          return next;
                                        });
                                      }}
                                      className={'text-xs font-semibold px-3 py-2 rounded-full border transition-colors ' + (isSel ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600')}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <p className="text-xs font-semibold text-gray-400 mb-2">{'Anything else? (Optional)'}</p>
                      <textarea
                        className="input resize-none h-24 mb-1 text-base sm:text-sm"
                        placeholder="Share a short message..."
                        value={feedbackText}
                        onChange={function (e) { setFeedbackText(e.target.value); }}
                        maxLength={1000}
                      />
                      <p className="text-right text-xs text-gray-300 mb-4">
                        {feedbackText.length + '/1000'}
                      </p>
                      <label className="flex items-start gap-2 mb-4 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={requestFollowUp}
                          onChange={function (e) { setRequestFollowUp(e.target.checked); }}
                          className="mt-0.5 w-4 h-4 accent-purple-600 flex-shrink-0"
                        />
                        <span className="text-xs text-gray-600 text-left">
                          {'I\u2019d like someone to follow up with me about this'}
                        </span>
                      </label>
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
                      <a
                        href={business.google_review_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full mt-3 py-3 rounded-xl border border-gray-200 flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <GoogleLogo />
                        {'Leave us a review on Google'}
                      </a>
                      <p className="text-center text-[11px] text-gray-300 mt-2">
                        {"It's your choice \u2014 send feedback, post publicly, or both."}
                      </p>
                    </form>

                  ) : (
                    /* ---------- default: star picker ---------- */
                    <>
                      <StarRating value={rating} onChange={handleRatingSelect} size="lg" />
                      <p className="text-xs mt-5" style={{ color: '#D1D5DB' }}>
                        {rating > 0 ? 'Tap a different star to change it' : 'Tap a star to rate your experience'}
                      </p>
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
                  <p className="text-sm text-gray-500 mb-5">
                    {'We\u2019ve let the ' + business.name + ' team know. We appreciate you taking the time.'}
                  </p>
                  {draftCopied && (
                    <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2 mb-4">
                      {'\u2713 Your review was copied \u2014 just paste it in the Google tab that opened.'}
                    </p>
                  )}
                  {business.google_review_url && (
                    <button
                      type="button"
                      onClick={function () { window.open(business.google_review_url, '_blank', 'noopener,noreferrer'); }}
                      className="text-xs font-semibold text-purple-600 hover:text-purple-700"
                    >
                      {usedDraft ? 'Didn\u2019t open? Tap to open Google Review' : 'Leave a Review on Google'}
                    </button>
                  )}
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