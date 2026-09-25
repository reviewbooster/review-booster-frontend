import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import api from '../lib/api';

// -- Level 1: Hub tour ------------------------------------------------------
// Spotlights the actual sidebar/nav item for each section, from wherever the
// owner currently is -- the sidebar is visible on every page, so this never
// needs to navigate anywhere on its own.
var HUB_STEPS = [
  {
    id: 'hub-dashboard',
    selector: '[data-tour-nav="/dashboard"]',
    title: 'Dashboard',
    description: 'This is your business command center. See how you\u2019re performing and reach the most important actions from here.',
  },
  {
    id: 'home-1',
    selector: '[data-tour="dashboard-stats"]',
    title: 'Your numbers at a glance',
    description: 'Average rating, total reviews, Google reviews, and private feedback \u2014 updated live, right when you open the app.',
  },
  {
    id: 'home-2',
    selector: '#tour-send-request-btn, [aria-label="Send Review Request"]',
    title: 'Send Review Request',
    description: 'The one thing you\u2019ll do most, always one tap away \u2014 here on desktop, or the + button at the bottom of your screen on mobile.',
  },
  {
    id: 'home-3',
    selector: '#tour-quick-actions',
    title: 'Quick Actions',
    description: 'Needs Followup, Check Private Feedback, View Analytics, View Reviews \u2014 your most common next steps, all in one place.',
  },
  {
    id: 'hub-reviews',
    selector: '[data-tour-nav="/dashboard/reviews-hub"]',
    title: 'Reviews',
    description: 'Where you collect, manage and understand customer feedback \u2014 your QR code, public Google reviews, and private feedback all live here.',
  },
  {
    id: 'hub-customers',
    selector: '[data-tour-nav="/dashboard/customers"]',
    title: 'Customers',
    description: 'Every customer record, review request, and follow-up you manage \u2014 all in one place.',
  },
  {
    id: 'hub-growth',
    selector: '[data-tour-nav="/dashboard/growth-hub"]',
    title: 'Growth',
    description: 'Turn happy customers into referrals, win back the ones who haven\u2019t been in for a while, and see what\u2019s actually working.',
  },
  {
    id: 'hub-settings',
    selector: '[data-tour-nav="/dashboard/settings-hub"]',
    title: 'Settings',
    description: 'Your business profile, message templates, and everything that configures how ReviewBooster behaves.',
  },
];

// -- Level 2: Deep dives ----------------------------------------------------
// Each deep dive only starts once the owner is actually on that page --
// triggered from DeepDiveTrigger, not from the hub tour directly.
var DEEP_DIVES = {
  qr: {
    route: '/dashboard/qr',
    steps: [
      { id: 'qr-1', selector: '#tour-qr-card', title: 'Your QR code', description: 'This is what customers scan to start leaving you feedback. Always active, unique to your business.' },
      { id: 'qr-2', selector: '#tour-qr-actions', title: 'Download, Share, Print', description: 'Download it as an image, share it straight to WhatsApp, or jump to printable materials \u2014 table tents, posters, stickers, counter cards.' },
      { id: 'qr-3', selector: '#tour-qr-placement', title: 'Where will you use it?', description: 'Tell us Counter, Table, or Staff and we\u2019ll recommend the print material that fits \u2014 or tap Staff to set up individual QR codes for your team.' },
      { id: 'qr-4', selector: '#tour-qr-performance', title: 'Review Performance', description: 'Scans, feedback, reviews, and conversion \u2014 pick a window and see how your QR is actually doing.' },
    ],
  },
  reviews: {
    route: '/dashboard/reviews',
    steps: [
      { id: 'rev-1', selector: '#tour-review-list', title: 'Your reviews', description: 'Every public review you\u2019ve collected, newest first.' },
      { id: 'rev-2', selector: '#tour-review-first-card', title: 'Review details', description: 'Tap any review to see the full text and the customer\u2019s contact info.' },
    ],
  },
  feedback: {
    route: '/dashboard/feedback',
    steps: [
      { id: 'fb-1', selector: '#tour-feedback-tabs', title: 'Unresolved, In Progress, Resolved', description: 'Private feedback moves through these three stages as you work through it.' },
      { id: 'fb-2', selector: '#tour-feedback-first-card', title: 'A piece of feedback', description: 'Tap one to see the full complaint, reply templates, and everything else you can do with it.' },
    ],
  },
  customers: {
    route: '/dashboard/customers',
    steps: [
      { id: 'cust-1', selector: '#tour-add-customer', title: 'Add Customer', description: 'Create a customer record by hand, whenever you have someone\u2019s details but no QR scan to go with them.' },
      { id: 'cust-2', selector: '#tour-customers-list', title: 'Your customers', description: 'Everyone who\u2019s scanned your QR, been added manually, or left feedback \u2014 all in one list, searchable.' },
    ],
  },
  'customer-detail': {
    route: null, // dynamic route -- matched by prefix at trigger time
    steps: [
      { id: 'cd-1', selector: '#tour-customer-actions', title: 'Message, Call, Follow-up', description: 'The three things you\u2019ll do most with a customer record, always right at the top.' },
      { id: 'cd-2', selector: '#tour-customer-followup', title: 'Next follow-up', description: 'See what\u2019s already scheduled, or set one up \u2014 so nobody falls through the cracks.' },
    ],
  },
  settings: {
    route: '/dashboard/settings-hub',
    steps: [
      { id: 'set-1', selector: '#tour-settings-profile', title: 'Business Profile', description: 'Your name, photo, business type, and Google review link all live here \u2014 the basics that affect everything else.' },
      { id: 'set-2', selector: '#tour-settings-templates', title: 'Message Templates', description: 'Every automated message ReviewBooster sends on your behalf \u2014 review requests, thank-yous, follow-ups \u2014 gets edited here.' },
    ],
  },
  templates: {
    route: '/dashboard/settings/message-templates',
    steps: [
      { id: 'tpl-1', selector: '#tour-template-review-request', title: 'Editing a template', description: 'You only write the middle part \u2014 the greeting and the review link (shown as locked pills above and below) are added automatically, every time.' },
      { id: 'tpl-2', selector: '#tour-template-save', title: 'Save Templates', description: 'One button saves all three templates at once. Changes apply to every message sent from that point on.' },
    ],
  },
  referrals: {
    route: '/dashboard/referrals',
    steps: [
      { id: 'ref-1', selector: '#tour-referral-redeem', title: 'Redeem a Referral', description: 'When a walk-in customer shows you their referral code, enter it here \u2014 this is the only place a referral actually gets credited.' },
      { id: 'ref-2', selector: '#tour-referral-top', title: 'Top Referrers', description: 'See who\u2019s referred the most customers and who\u2019s earned a reward, ranked by points.' },
    ],
  },
  'win-back': {
    route: '/dashboard/win-back',
    steps: [
      { id: 'wb-1', selector: '#tour-winback-settings', title: 'Win-back reminders', description: 'Set how many inactive days count as \u201cdue,\u201d write your message once, and turn it on \u2014 customers who cross that line show up below automatically.' },
      { id: 'wb-2', selector: '#tour-winback-due', title: 'Customers Due', description: 'Everyone past your threshold, with a pre-filled WhatsApp message one tap away.' },
    ],
  },
  analytics: {
    route: '/dashboard/analytics',
    steps: [
      { id: 'an-1', selector: '#tour-analytics-summary', title: 'Your numbers', description: 'Requests sent, reviews collected, and your average rating, all in one strip.' },
      { id: 'an-2', selector: '#tour-analytics-funnel', title: 'Review Funnel', description: 'See exactly where your reviews are coming from \u2014 and if any went to private feedback instead of Google, that\u2019s shown here too.' },
    ],
  },
};

function isVisible(el) {
  if (!el) return false;
  var rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function findTarget(selector) {
  var all = document.querySelectorAll(selector);
  for (var i = 0; i < all.length; i++) {
    if (isVisible(all[i])) return all[i];
  }
  return null;
}

export default function SpotlightTour() {
  const router = useRouter();
  const [active,   setActive]   = useState(false);
  const [stepList, setStepList] = useState([]); // resolved list of step objects for the current run
  const [stepIdx,  setStepIdx]  = useState(0);
  const [rect,     setRect]     = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const retryRef = useRef(0);

  var currentStep = stepList[stepIdx] || null;

  // Watch viewport width for the mobile bottom-sheet layout.
  useEffect(function() {
    function check() { setIsMobile(window.innerWidth < 768); }
    check();
    window.addEventListener('resize', check);
    return function() { window.removeEventListener('resize', check); };
  }, []);

  // Resolve the target element's position whenever the active step or route changes.
  var measure = useCallback(function() {
    if (!currentStep) { setRect(null); return; }
    var el = findTarget(currentStep.selector);
    if (el) {
      retryRef.current = 0;
      setRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    } else if (retryRef.current < 8) {
      // Element may not have mounted yet (async data, route just changed) --
      // retry briefly rather than getting stuck with no spotlight.
      retryRef.current += 1;
      setTimeout(measure, 200);
    } else {
      // Genuinely not on the page right now -- skip this step rather than
      // showing a spotlight with nothing to point at.
      goNext();
    }
    // eslint-disable-next-line
  }, [currentStep]);

  useEffect(function() {
    retryRef.current = 0;
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return function() {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
    // eslint-disable-next-line
  }, [currentStep, router.pathname]);

  function persistStep(idx) {
    try { localStorage.setItem('rb_tour_step', String(idx)); } catch (e) {}
  }

  function endTour(status) {
    setActive(false);
    setStepList([]);
    try {
      localStorage.removeItem('rb_tour_active');
      localStorage.removeItem('rb_tour_step');
      localStorage.removeItem('rb_tour_kind');
      localStorage.removeItem('rb_tour_dive');
    } catch (e) {}
    if (status === 'completed') {
      api.patch('/business/my-settings', { product_tour_completed: true }).catch(function() {});
    } else if (status === 'skipped') {
      api.patch('/business/my-settings', { product_tour_completed: true, tour_skipped: true }).catch(function() {});
    }
  }

  function goNext() {
    setStepIdx(function(prev) {
      var next = prev + 1;
      if (next >= stepList.length) {
        endTour('completed');
        return prev;
      }
      persistStep(next);
      return next;
    });
  }

  function skipTour() {
    endTour('skipped');
  }

  // Start (or resume) a hub-level tour run.
  function startHubTour() {
    if (active) return;
    setStepList(HUB_STEPS);
    setStepIdx(0);
    setActive(true);
    try {
      localStorage.setItem('rb_tour_active', '1');
      localStorage.setItem('rb_tour_kind', 'hub');
      localStorage.setItem('rb_tour_step', '0');
    } catch (e) {}
  }

  // Start a deep-dive run for a specific feature key -- called by each
  // page's own first-visit trigger. Deliberately a no-op (and does NOT mark
  // the dive as seen) if a tour is already running, e.g. the hub tour is
  // mid-flight and happens to be sitting on this same page -- it'll get a
  // fair chance to auto-trigger again on a later, uncontested visit instead
  // of silently never showing at all.
  function startDeepDive(key) {
    if (active) return;
    var dive = DEEP_DIVES[key];
    if (!dive) return;
    setStepList(dive.steps);
    setStepIdx(0);
    setActive(true);
    try {
      localStorage.setItem('rb_tour_active', '1');
      localStorage.setItem('rb_tour_kind', 'deep');
      localStorage.setItem('rb_tour_dive', key);
      localStorage.setItem('rb_tour_step', '0');
      localStorage.setItem('rb_deep_dive_seen_' + key, '1');
    } catch (e) {}
  }

  // Expose start functions globally so the "Show me around" button and
  // per-page deep-dive triggers can reach this single mounted instance
  // without prop-drilling through every layout.
  useEffect(function() {
    window.__rbStartHubTour = startHubTour;
    window.__rbStartDeepDive = startDeepDive;
    return function() {
      delete window.__rbStartHubTour;
      delete window.__rbStartDeepDive;
    };
    // eslint-disable-next-line
  }, [stepList]);

  // Resume an in-progress tour on mount / route change (e.g. after a hub
  // step's Next navigated to a new page for a queued deep dive).
  useEffect(function() {
    try {
      if (localStorage.getItem('rb_tour_active') !== '1') return;
      var kind = localStorage.getItem('rb_tour_kind');
      var idx  = parseInt(localStorage.getItem('rb_tour_step') || '0', 10);
      if (kind === 'hub') {
        setStepList(HUB_STEPS);
        setStepIdx(isNaN(idx) ? 0 : idx);
        setActive(true);
      } else if (kind === 'deep') {
        var diveKey = localStorage.getItem('rb_tour_dive');
        var dive = DEEP_DIVES[diveKey];
        if (dive) {
          setStepList(dive.steps);
          setStepIdx(isNaN(idx) ? 0 : idx);
          setActive(true);
        }
      }
    } catch (e) {}
    // eslint-disable-next-line
  }, []);

  // Esc to skip.
  useEffect(function() {
    if (!active) return;
    function onKey(e) { if (e.key === 'Escape') skipTour(); }
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line
  }, [active]);

  if (!active || !currentStep) return null;

  var isLast = stepIdx === stepList.length - 1;
  var PAD = 6;

  // -- Tooltip placement: prefer below, then above, then right, then left,
  // clamped to stay on-screen. On mobile this also reserves space for the
  // app's own fixed top bar (~56px) and bottom nav (~64px + safe-area) so
  // the tooltip never renders under them -- and, just as important, never
  // renders ON TOP of them either, since most Level 1 targets (the nav
  // icons themselves) live inside those two bars. A tooltip that covered
  // its own target would defeat the point of spotlighting it. --
  var tooltipStyle = {};
  var vw = window.innerWidth, vh = window.innerHeight;
  var TW = Math.min(320, vw - 24);
  var TH_ESTIMATE = 170;
  // A fixed estimate rather than trying to read env(safe-area-inset-bottom)
  // via JS (which has no reliable cross-browser read path without injecting
  // a probe element) -- generous enough to clear the home indicator on
  // notched iPhones, harmless extra margin on Android and older devices.
  var safeAreaBottom = 24;
  var topReserve    = isMobile ? 56 : 0;
  var bottomReserve = isMobile ? (64 + safeAreaBottom) : 0;

  if (rect) {
    var spaceBelow = (vh - bottomReserve) - rect.bottom;
    var spaceAbove = rect.top - topReserve;
    var left = Math.min(Math.max(rect.left, 12), vw - TW - 12);

    if (spaceBelow >= TH_ESTIMATE + 16) {
      tooltipStyle = { top: rect.bottom + 14, left: left, width: TW };
    } else if (spaceAbove >= TH_ESTIMATE + 16) {
      tooltipStyle = { top: rect.top - TH_ESTIMATE - 14, left: left, width: TW };
    } else if (!isMobile && vw - rect.right >= TW + 24) {
      tooltipStyle = { top: Math.min(Math.max(rect.top, 12), vh - TH_ESTIMATE - 12), left: rect.right + 14, width: TW };
    } else if (!isMobile && rect.left >= TW + 24) {
      tooltipStyle = { top: Math.min(Math.max(rect.top, 12), vh - TH_ESTIMATE - 12), left: Math.max(rect.left - TW - 14, 12), width: TW };
    } else {
      // Nothing fits cleanly (rare) -- anchor just above the bottom
      // reserve, never covering the app's own bottom nav.
      tooltipStyle = { top: vh - bottomReserve - TH_ESTIMATE - 14, left: Math.min(Math.max(12, (vw - TW) / 2), vw - TW - 12), width: TW };
    }
  }

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Product tour">
      {/* Dimming overlay with a real cutout at the target -- a transparent
          box sized to the target with a huge box-shadow spread fills the
          rest of the viewport, which is simpler and more robust than
          clip-path across browsers. */}
      {rect && (
        <div
          className="absolute rounded-xl pointer-events-none transition-all duration-200"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(15, 15, 20, 0.68)',
            outline: '2px solid #A78BFA',
            outlineOffset: '2px',
          }}
        />
      )}
      {!rect && <div className="absolute inset-0 bg-black/60" />}

      {rect && (
        <div
          className="absolute bg-white rounded-2xl shadow-2xl p-4"
          style={tooltipStyle}
        >
          <TourCardContent
            step={stepIdx}
            total={stepList.length}
            title={currentStep.title}
            description={currentStep.description}
            isLast={isLast}
            onNext={goNext}
            onSkip={skipTour}
          />
        </div>
      )}

      {/* No target found -- centered card instead of a positioned one */}
      {!rect && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="w-full bg-white rounded-2xl shadow-2xl p-5" style={{ maxWidth: TW }}>
            <TourCardContent
              step={stepIdx}
              total={stepList.length}
              title={currentStep.title}
              description={currentStep.description}
              isLast={isLast}
              onNext={goNext}
              onSkip={skipTour}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TourCardContent({ step, total, title, description, isLast, onNext, onSkip }) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-2.5">
        {Array.from({ length: total }).map(function(_, i) {
          return (
            <span
              key={i}
              className="h-1 rounded-full flex-1 transition-colors"
              style={{ backgroundColor: i <= step ? '#7C3AED' : '#E5E7EB' }}
            />
          );
        })}
      </div>
      <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wide mb-1">
        {(step + 1) + ' of ' + total}
      </p>
      <p className="text-sm font-bold text-gray-900 mb-1.5">{title}</p>
      <p className="text-xs text-gray-500 leading-relaxed mb-4">{description}</p>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onSkip}
          className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
        >
          Skip tour
        </button>
        <button
          type="button"
          onClick={onNext}
          className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
        >
          {isLast ? 'Finish' : 'Next \u2192'}
        </button>
      </div>
    </div>
  );
}