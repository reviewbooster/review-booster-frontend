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
import { LANGUAGES, UI_STRINGS } from '../../lib/uiStrings';
import { isStandalonePWA } from '../../lib/waLink';

function openGoogleReview(url) {
  if (isStandalonePWA()) {
    window.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

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

function BusinessHeader({ business, subtitle }) {
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
        {subtitle}
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

  // -- language selection, shown before anything else ----------------------
  const [lang,          setLang]         = useState(null);
  const [langSelected,  setLangSelected] = useState(false);

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

  var t = function (key) {
    var dict = (lang && UI_STRINGS[lang]) || UI_STRINGS.en;
    return dict[key] !== undefined ? dict[key] : UI_STRINGS.en[key];
  };

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
      setIdError(t('nameRequiredError'));
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
      setIdError(err.response?.data?.error || t('genericIdError'));
    } finally {
      setIdSubmitting(false);
    }
  };

  var handleIdentifySkip = function () {
    setScreen(SCREEN.RATE);
  };

  // Tapping a star only selects it now -- it stays on the star screen so the
  // customer can change their mind. Only "Continue" commits to a path.
  var handleRatingSelect = function (r) {
    setRating(r);
  };

  var handleRatingContinue = function () {
    if (rating >= 1 && rating <= 3) {
      setSelectedIssueKeys([]);
      setIssueFollowUpAnswers({});
      setFeedbackText('');
      setIssueScreen('A');
    } else if (rating >= 4) {
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
      lang: lang,
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
    if (draftText) {
      copyTextToClipboard(draftText).then(function () { setDraftCopied(true); }).catch(function () {});
    }
    if (business.google_review_url) {
      openGoogleReview(business.google_review_url);
    }
    var chipLabels = getExperienceChips(business.type, lang)
      .filter(function (c) { return selectedChips.indexOf(c.key) !== -1; })
      .map(function (c) { return c.label; });
    submitReview(rating, draftText, chipLabels);
  };

  var handleSkipToGoogle = function () {
    setUsedDraft(false);
    if (business.google_review_url) {
      openGoogleReview(business.google_review_url);
    }
    var chipLabels = getExperienceChips(business.type, lang)
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
    return selectedIssueKeys.map(function (key) { return findIssue(business.type, key, lang); }).filter(Boolean);
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

  var headerTitle = t('rateHeaderTitle');
  var headerSubtitle = t('rateHeaderSubtitle');
  if (draftScreen) {
    headerTitle = t('draftHeaderTitle');
    headerSubtitle = t('draftHeaderSubtitle');
  } else if (issueScreen === 'A') {
    headerTitle = t('issueHeaderTitleA');
    headerSubtitle = t('issueHeaderSubtitleA');
  } else if (issueScreen === 'B') {
    headerTitle = t('issueHeaderTitleB');
    headerSubtitle = selectedIssueKeys.length > 0
      ? (t('youSelected') + selectedIssueKeys.map(function (k) { var i = findIssue(business ? business.type : null, k, lang); return i ? i.label : ''; }).filter(Boolean).join(', '))
      : '';
  }

  // -- language gate: shown before everything else, regardless of load state
  if (!langSelected) {
    return (
      <>
        <Head>
          <title>ReviewBooster</title>
          <meta name="robots" content="noindex, nofollow" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div
          className="min-h-screen flex items-center justify-center px-5"
          style={{ background: 'linear-gradient(135deg,#7C3AED 0%,#4F46E5 100%)' }}
        >
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
            <h1 className="text-lg font-bold text-gray-900 mb-6">{t('langTitle')}</h1>
            <div className="flex flex-col gap-3">
              {LANGUAGES.map(function (l) {
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={function () { setLang(l.code); setLangSelected(true); }}
                    className="w-full py-3 rounded-xl border border-gray-200 text-base font-semibold text-gray-800 hover:border-purple-400 hover:bg-purple-50 transition-colors"
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </>
    );
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

      <button
        type="button"
        onClick={function () { setLangSelected(false); }}
        aria-label={t('langTitle')}
        className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-[11px] font-bold text-purple-700 hover:bg-purple-50 transition-colors"
      >
        {lang === 'hi' ? 'हि' : (lang === 'mr' ? 'मर' : 'EN')}
      </button>

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
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>{t('loading')}</p>
              </div>
            </div>
          )}

          {screen === SCREEN.INVALID && (
            <div className="flex items-center justify-center p-8 bg-white" style={{ minHeight: '320px' }}>
              <div className="text-center">
                <p className="text-5xl mb-4">&#128279;</p>
                <h1 className="text-xl font-bold text-gray-900 mb-2">{t('linkNotFound')}</h1>
                <p className="text-sm text-gray-500">
                  {t('linkNotFoundBody')}
                </p>
              </div>
            </div>
          )}

          {screen === SCREEN.ALREADY_DONE && (
            <div className="flex items-center justify-center p-8 bg-white" style={{ minHeight: '320px' }}>
              <div className="text-center">
                <p className="text-5xl mb-4">&#9989;</p>
                <h1 className="text-xl font-bold text-gray-900 mb-2">{t('alreadySubmitted')}</h1>
                <p className="text-sm text-gray-500">
                  {t('alreadySubmittedBody')(business && business.name)}
                </p>
              </div>
            </div>
          )}

          {screen === SCREEN.IDENTIFY && business && (
            <>
              <BusinessHeader business={business} subtitle={t('feedbackHelps')} />
              <div className="bg-white rounded-t-3xl -mt-6 px-6 pt-8 pb-8 relative">
                <h2 className="text-lg font-bold text-gray-900 text-center mb-2">{t('beforeYouRate')}</h2>
                <p className="text-xs text-gray-400 text-center mb-6">
                  {t('beforeYouRateSub')}
                </p>
                <form onSubmit={handleIdentifySubmit}>
                  {idError && (
                    <div className="bg-red-50 text-red-500 text-xs rounded-lg px-3 py-2 mb-4">{idError}</div>
                  )}
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder={t('namePlaceholder')}
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
                      <option value="+91">{'🇮🇳 +91'}</option>
                      <option value="+1">{'🇺🇸 +1'}</option>
                      <option value="+44">{'🇬🇧 +44'}</option>
                      <option value="+971">{'🇦🇪 +971'}</option>
                      <option value="+65">{'🇸🇬 +65'}</option>
                      <option value="+61">{'🇦🇺 +61'}</option>
                      <option value="+92">{'🇵🇰 +92'}</option>
                      <option value="+880">{'🇧🇩 +880'}</option>
                      <option value="+94">{'🇱🇰 +94'}</option>
                      <option value="+977">{'🇳🇵 +977'}</option>
                    </select>
                    <input
                      type="tel"
                      placeholder={t('phonePlaceholder')}
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
                    {idSubmitting ? t('pleaseWait') : t('continue')}
                  </button>
                  <button
                    type="button"
                    onClick={handleIdentifySkip}
                    disabled={idSubmitting}
                    className="w-full py-3 mt-2 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {t('skip')}
                  </button>
                </form>
              </div>
            </>
          )}

          {screen === SCREEN.RATE && business && (
            <>
              <BusinessHeader business={business} subtitle={t('feedbackHelps')} />
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
                        {t('whatStoodOut')}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {getExperienceChips(business.type, lang).map(function (c) {
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
                            <p className="text-xs font-semibold text-gray-500">{t('yourReviewDraft')}</p>
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={function () { regenerateDraft(selectedChips); }}
                                className="text-[11px] font-semibold text-purple-600 hover:text-purple-700"
                              >
                                {'↻ ' + t('shuffle')}
                              </button>
                              <button
                                type="button"
                                onClick={handleMakeShorter}
                                className="text-[11px] font-semibold text-purple-600 hover:text-purple-700"
                              >
                                {t('makeItShorter')}
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
                            {t('aiDraftNote')}
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
                              {t('copyDraft')}
                            </button>
                            <button
                              type="button"
                              onClick={handleEditDraft}
                              className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              {t('edit')}
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
                        {t('skipToGoogle')}
                      </button>
                      <p className="text-center text-[11px] text-gray-300 mt-1">
                        {t('startingPointNote')}
                      </p>
                    </div>

                  ) : issueScreen === 'A' ? (
                    /* ---------- 1-3 star, screen A: pick issue(s) ---------- */
                    <div className="text-left">
                      {getIssueGroups(business.type, lang).map(function (g) {
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
                        {t('continue')}
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

                      <p className="text-xs font-semibold text-gray-400 mb-2">{t('anythingElse')}</p>
                      <textarea
                        className="input resize-none h-24 mb-1 text-base sm:text-sm"
                        placeholder={t('shareShortMessage')}
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
                          {t('followUpCheckbox')}
                        </span>
                      </label>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ backgroundColor: '#7C3AED' }}
                      >
                        {submitting
                          ? <><span className="spinner" />{' ' + t('sending')}</>
                          : t('sendFeedback')
                        }
                      </button>
                      <a
                        href={business.google_review_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full mt-3 py-3 rounded-xl border border-gray-200 flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <GoogleLogo />
                        {t('leaveGoogleReview')}
                      </a>
                      <p className="text-center text-[11px] text-gray-300 mt-2">
                        {t('yourChoiceNote')}
                      </p>
                    </form>

                  ) : (
                    /* ---------- default: star picker ---------- */
                    <>
                      <StarRating value={rating} onChange={handleRatingSelect} size="lg" />
                      <p className="text-xs mt-5" style={{ color: '#D1D5DB' }}>
                        {rating > 0 ? t('tapStarToChange') : t('tapStarToRate')}
                      </p>
                      {rating > 0 && (
                        <button
                          type="button"
                          onClick={handleRatingContinue}
                          className="w-full mt-4 py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90"
                          style={{ backgroundColor: '#7C3AED' }}
                        >
                          {t('continue')}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <p className="text-center pb-8" style={{ fontSize: '11px', color: '#D1D5DB' }}>
                {t('poweredBy')}
              </p>
            </>
          )}

          {screen === SCREEN.THANK_PUBLIC && business && (
            <>
              <BusinessHeader business={business} subtitle={t('feedbackHelps')} />
              <div className="px-5 pb-8" style={{ marginTop: '-32px' }}>
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                  <p className="text-5xl mb-4">{'🎉'}</p>
                  <h1 className="text-xl font-bold text-gray-900 mb-2">
                    {t('thanksGreatRating')}
                  </h1>
                  <p className="text-sm text-gray-500 mb-5">
                    {t('thanksGreatRatingBody')(business.name)}
                  </p>
                  {draftCopied && (
                    <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2 mb-4">
                      {t('copiedNote')}
                    </p>
                  )}
                  {business.google_review_url && (
                    <button
                      type="button"
                      onClick={function () { openGoogleReview(business.google_review_url); }}
                      className="text-xs font-semibold text-purple-600 hover:text-purple-700"
                    >
                      {usedDraft ? t('didntOpenTapToOpen') : t('leaveReviewOnGoogle')}
                    </button>
                  )}
                </div>
              </div>
              <p className="text-center pb-8" style={{ fontSize: '11px', color: '#D1D5DB' }}>
                {t('poweredBy')}
              </p>
            </>
          )}

          {screen === SCREEN.THANK_PRIVATE && business && (
            <>
              <BusinessHeader business={business} subtitle={t('feedbackHelps')} />
              <div className="px-5 pb-8" style={{ marginTop: '-32px' }}>
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                  <p className="text-5xl mb-4">{'🙏'}</p>
                  <h1 className="text-xl font-bold text-gray-900 mb-2">
                    {t('thankYouHonesty')}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {t('thankYouHonestyBody')(business.name)}
                  </p>
                </div>
              </div>
              <p className="text-center pb-8" style={{ fontSize: '11px', color: '#D1D5DB' }}>
                {t('poweredBy')}
              </p>
            </>
          )}

        </div>
      </div>
    </>
  );
}
