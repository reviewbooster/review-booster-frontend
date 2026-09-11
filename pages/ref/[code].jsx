/**
 * pages/ref/[code].jsx
 *
 * PUBLIC ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â no auth required.
 * A customer's personal referral link. Read-only: shows the business,
 * the offer, and the code to show in person. Nothing is submitted here ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â
 * attribution happens later when staff verify the code at checkout.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import api from '../../lib/api';

const SCREEN = {
  LOADING: 'loading',
  INVALID: 'invalid',
  READY:   'ready',
};

function normalizeHandle(v) {
  if (!v) return '';
  return v.trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?(instagram|facebook)\.com\//i, '')
    .replace(/\/$/, '');
}
function instagramUrl(v) { return 'https://instagram.com/' + normalizeHandle(v); }
function facebookUrl(v)  { return 'https://facebook.com/' + normalizeHandle(v); }
function mapsUrl(address) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address); }

export default function ReferralLanding() {
  const router = useRouter();
  const { code } = router.query;

  const [screen, setScreen]     = useState(SCREEN.LOADING);
  const [referral, setReferral] = useState(null);
  const [copied, setCopied]     = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // A visits their own link via the WhatsApp Thank+Refer message, which
  // tags it ?owner=1 the first time. We remember that in this browser so
  // only A (not friends they share the link with) sees the status section
  // below \u2014 there is no customer login to check this properly otherwise.
  useEffect(function() {
    if (!router.isReady || !code) return;
    var storageKey = 'rb_referral_owner_' + code;
    if (router.query.owner === '1') {
      localStorage.setItem(storageKey, '1');
      router.replace('/ref/' + code, undefined, { shallow: true });
    }
    setIsOwner(localStorage.getItem(storageKey) === '1');
  }, [router.isReady, code, router.query.owner]);

  useEffect(() => {
    if (!code) return;
    api.get('/referrals/' + code)
      .then(function (res) {
        setReferral(res.data.data);
        setScreen(SCREEN.READY);
      })
      .catch(function () {
        setScreen(SCREEN.INVALID);
      });
  }, [code]);

  var handleCopyCode = function () {
    if (!referral) return;
    navigator.clipboard.writeText(referral.code).then(function () {
      setCopied(true);
      setTimeout(function () { setCopied(false); }, 2000);
    });
  };

  return (
    <>
      <Head>
        <title>ReviewBooster</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-gray-50">

        {screen === SCREEN.LOADING && (
          <div className="min-h-screen flex flex-col items-center justify-center p-5">
            <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-transparent animate-spin" />
          </div>
        )}

        {screen === SCREEN.INVALID && (
          <div className="min-h-screen flex flex-col items-center justify-center p-5">
            <div className="text-center max-w-sm">
              <p className="text-5xl mb-4">{'\uD83D\uDD17'}</p>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Referral Link</h1>
              <p className="text-gray-500 text-sm">This link is invalid or no longer active.</p>
            </div>
          </div>
        )}

        {screen === SCREEN.READY && referral && (
          <>
            <div
              className="pt-12 pb-16 flex flex-col items-center px-5"
              style={{ background: 'linear-gradient(135deg,#7C3AED 0%,#4F46E5 100%)' }}
            >
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-xl mb-4">
                {referral.logo_url ? (
                  <img src={referral.logo_url} alt={referral.business_name} className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold" style={{ color: '#7C3AED' }}>
                    {referral.business_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <h1 className="text-white font-bold text-xl mb-1 text-center">
                {referral.referrer_name
                  ? referral.referrer_name + ' invited you to ' + referral.business_name
                  : 'You\u2019re invited to ' + referral.business_name}
              </h1>
              <p className="text-center" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                Show your code below on your next visit
              </p>
            </div>

            <div className="bg-white rounded-t-3xl -mt-6 px-6 pt-8 pb-8 relative">

              {referral.offer_text && (
                <div className="rounded-2xl p-4 mb-5 text-center" style={{ backgroundColor: '#F3E8FF' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#7C3AED' }}>
                    Your Offer
                  </p>
                  <p className="text-sm font-semibold text-gray-900 leading-relaxed">{referral.offer_text}</p>
                </div>
              )}

              <div className="text-center mb-6">
                <p className="text-xs text-gray-400 mb-2">Show this code when you visit</p>
                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors"
                >
                  <span className="text-2xl font-bold tracking-[0.2em] text-purple-700 font-mono">{referral.code}</span>
                  <svg width="16" height="16" fill="none" stroke="#7C3AED" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                {copied && <p className="text-[11px] text-green-600 font-semibold mt-2">{'\u2713'} Copied</p>}
              </div>

              {isOwner && referral.referral_status && (
                <div className="rounded-2xl p-4 mb-5" style={{ backgroundColor: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-2 text-center text-gray-400">
                    Your Referral Status
                  </p>
                  <p className="text-center text-sm font-semibold text-gray-900 mb-1">
                    {referral.referral_status.redeemed_count + ' friend' + (referral.referral_status.redeemed_count === 1 ? '' : 's') + ' referred so far'}
                  </p>
                  {referral.referral_status.rewards_pending > 0 ? (
                    <p className="text-center text-xs text-green-600 font-semibold">
                      {'\uD83C\uDF89 You have ' + referral.referral_status.rewards_pending + ' reward' + (referral.referral_status.rewards_pending === 1 ? '' : 's') + ' ready \u2014 ask us about it on your next visit!'}
                    </p>
                  ) : (
                    <p className="text-center text-xs text-gray-500">
                      {referral.referral_status.remaining_to_next + ' more referral' + (referral.referral_status.remaining_to_next === 1 ? '' : 's') + ' until your next reward'}
                    </p>
                  )}
                  {referral.referral_status.reward_text && (
                    <p className="text-center text-[11px] text-gray-400 mt-1.5">
                      {'Reward: ' + referral.referral_status.reward_text}
                    </p>
                  )}
                </div>
              )}

              {(referral.address || referral.instagram || referral.facebook || referral.other_contact) && (
                <div className="border-t border-gray-100 pt-5 space-y-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1 text-center">
                    Find Us
                  </p>

                  {referral.address && (
                    <a href={mapsUrl(referral.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl px-3.5 py-2.5 transition-colors"
                    >
                      <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#F3E8FF' }}>
                        <svg width="13" height="13" fill="none" stroke="#7C3AED" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                          <circle cx="12" cy="11" r="3" />
                        </svg>
                      </span>
                      <span className="text-xs text-gray-700 flex-1 min-w-0">{referral.address}</span>
                    </a>
                  )}

                  {referral.instagram && (
                    <a href={instagramUrl(referral.instagram)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl px-3.5 py-2.5 transition-colors"
                    >
                      <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#FCE7F3' }}>
                        <svg width="13" height="13" fill="none" stroke="#DB2777" strokeWidth="2" viewBox="0 0 24 24">
                          <rect x="3" y="3" width="18" height="18" rx="5" />
                          <circle cx="12" cy="12" r="4" />
                          <circle cx="17.5" cy="6.5" r="1" fill="#DB2777" stroke="none" />
                        </svg>
                      </span>
                      <span className="text-xs text-gray-700 flex-1 min-w-0 truncate">{'@' + normalizeHandle(referral.instagram)}</span>
                      <svg width="11" height="11" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  )}

                  {referral.facebook && (
                    <a href={facebookUrl(referral.facebook)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl px-3.5 py-2.5 transition-colors"
                    >
                      <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#DBEAFE' }}>
                        <svg width="13" height="13" fill="none" stroke="#2563EB" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                        </svg>
                      </span>
                      <span className="text-xs text-gray-700 flex-1 min-w-0 truncate">{normalizeHandle(referral.facebook)}</span>
                      <svg width="11" height="11" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  )}

                  {referral.other_contact && referral.other_contact.split('\n').map(function (line, i) {
                    var trimmed = line.trim();
                    if (!trimmed) return null;
                    var isLink = /^https?:\/\//i.test(trimmed);
                    return (
                      <div key={i} className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3.5 py-2.5">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-gray-200">
                          <svg width="13" height="13" fill="none" stroke="#6B7280" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5" />
                          </svg>
                        </span>
                        {isLink ? (
                          <a href={trimmed} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 underline flex-1 min-w-0 truncate">
                            {trimmed}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-700 flex-1 min-w-0 truncate">{trimmed}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </>
        )}

      </div>
    </>
  );
}
