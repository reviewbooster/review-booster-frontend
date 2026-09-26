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
    line: 'Your business command center.',
    points: ['See performance', 'Reach key actions fast'],
  },
  {
    id: 'home-1',
    selector: '[data-tour="dashboard-stats"]',
    title: 'Your Numbers',
    line: 'Live stats, right when you open the app.',
    points: ['Rating, reviews, feedback'],
  },
  {
    id: 'home-2',
    selector: '#tour-send-request-btn, [aria-label="Send Review Request"]',
    title: 'Send Review Request',
    line: 'Get a request out in one tap.',
    points: [],
  },
  {
    id: 'home-3',
    selector: '#tour-quick-actions',
    title: 'Quick Actions',
    line: 'Jump straight to what\u2019s next.',
    points: ['Follow-ups', 'Feedback', 'Analytics', 'Reviews'],
  },
  {
    id: 'hub-reviews',
    selector: '[data-tour-nav="/dashboard/reviews-hub"]',
    title: 'Reviews',
    line: 'Collect and manage all your reviews.',
    points: ['QR code', 'Google reviews', 'Private feedback'],
  },
  {
    id: 'hub-customers',
    selector: '[data-tour-nav="/dashboard/customers"]',
    title: 'Customers',
    line: 'Every customer, in one place.',
    points: ['Records', 'Requests', 'Follow-ups'],
  },
  {
    id: 'hub-growth',
    selector: '[data-tour-nav="/dashboard/growth-hub"]',
    title: 'Growth',
    line: 'Turn customers into growth.',
    points: ['Referrals', 'Win-back', 'Analytics'],
  },
  {
    id: 'hub-settings',
    selector: '[data-tour-nav="/dashboard/settings-hub"]',
    title: 'Settings',
    line: 'Configure your business.',
    points: ['Profile', 'Message templates'],
  },
];

// -- Level 2: Deep dives ----------------------------------------------------
// Each deep dive only starts once the owner is actually on that page --
// triggered from each page's own first-visit effect, not from the hub tour.
var DEEP_DIVES = {
  qr: {
    route: '/dashboard/qr',
    steps: [
      { id: 'qr-1', selector: '#tour-qr-card', title: 'Your QR Code', line: 'Customers scan this to leave feedback.', points: [] },
      { id: 'qr-2', selector: '#tour-qr-actions', title: 'Download, Share, Print', line: 'Get it in front of customers.', points: [] },
      { id: 'qr-3', selector: '#tour-qr-placement', title: 'Where Will You Use It?', line: 'Tell us, and we\u2019ll recommend a design.', points: [] },
      { id: 'qr-4', selector: '#tour-qr-performance', title: 'Performance', line: 'Track scans, reviews, and conversion.', points: [] },
    ],
  },
  reviews: {
    route: '/dashboard/reviews',
    steps: [
      { id: 'rev-2', selector: '#tour-review-first-card', title: 'Your Reviews', line: 'Tap any review for full details.', points: [] },
    ],
  },
  feedback: {
    route: '/dashboard/feedback',
    steps: [
      { id: 'fb-1', selector: '#tour-feedback-tabs', title: 'Feedback Stages', line: 'Moves through 3 stages as you work it.', points: ['Unresolved \u2192 In Progress \u2192 Resolved'] },
      { id: 'fb-2', selector: '#tour-feedback-first-card', title: 'A Feedback Item', line: 'Tap one to respond.', points: [] },
    ],
  },
  customers: {
    route: '/dashboard/customers',
    steps: [
      { id: 'cust-1', selector: '#tour-add-customer', title: 'Add Customer', line: 'Add someone by hand, anytime.', points: [] },
      { id: 'cust-2', selector: '#tour-customers-list', title: 'Your Customers', line: 'Everyone, searchable.', points: [] },
    ],
  },
  'customer-detail': {
    route: null, // dynamic route -- matched by prefix at trigger time
    steps: [
      { id: 'cd-1', selector: '#tour-customer-actions', title: 'Message, Call, Follow-up', line: 'Your most-used actions, up top.', points: [] },
      { id: 'cd-2', selector: '#tour-customer-followup', title: 'Next Follow-up', line: 'See what\u2019s scheduled, or set one.', points: [] },
    ],
  },
  settings: {
    route: '/dashboard/settings-hub',
    steps: [
      { id: 'set-1', selector: '#tour-settings-profile', title: 'Business Profile', line: 'Your name, photo, type, Google link.', points: [] },
      { id: 'set-2', selector: '#tour-settings-templates', title: 'Message Templates', line: 'Every automated message, edited here.', points: [] },
    ],
  },
  templates: {
    route: '/dashboard/settings/message-templates',
    steps: [
      { id: 'tpl-1', selector: '#tour-template-review-request', title: 'Editing a Template', line: 'Write the middle \u2014 the rest is automatic.', points: ['Name & link added for you'] },
      { id: 'tpl-2', selector: '#tour-template-save', title: 'Save Templates', line: 'One tap saves all three.', points: [] },
    ],
  },
  referrals: {
    route: '/dashboard/referrals',
    steps: [
      { id: 'ref-1', selector: '#tour-referral-redeem', title: 'Redeem a Referral', line: 'Enter a customer\u2019s code here.', points: [] },
      { id: 'ref-2', selector: '#tour-referral-top', title: 'Top Referrers', line: 'See who\u2019s earned the most.', points: [] },
    ],
  },
  'win-back': {
    route: '/dashboard/win-back',
    steps: [
      { id: 'wb-1', selector: '#tour-winback-settings', title: 'Win-Back Reminders', line: 'Turn on automatic reminders.', points: ['Set your inactive-days threshold'] },
      { id: 'wb-2', selector: '#tour-winback-due', title: 'Customers Due', line: 'Everyone due, message ready.', points: [] },
    ],
  },
  analytics: {
    route: '/dashboard/analytics',
    steps: [
      { id: 'an-1', selector: '#tour-analytics-summary', title: 'Your Numbers', line: 'Requests, reviews, and rating.', points: [] },
      { id: 'an-2', selector: '#tour-analytics-funnel', title: 'Review Funnel', line: 'See where your reviews come from.', points: [] },
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
  const [activeDiveKey, setActiveDiveKey] = useState(null); // which DEEP_DIVES key (if any) is the current run

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
      // Only now -- once a target has actually been found and is genuinely
      // about to be shown -- record that this deep dive has been seen. If
      // every step's target search fails (e.g. the page's own data hasn't
      // finished loading yet on a slow connection or a cold backend), this
      // never fires, so the dive gets a real chance again on a future visit
      // instead of being silently marked "seen" for something never shown.
      if (activeDiveKey) {
        try {
          localStorage.setItem('rb_deep_dive_seen_' + activeDiveKey, '1');
        } catch (e) {}
      }
    } else if (retryRef.current < 15) {
      // Element may not have mounted yet (async data, route just changed) --
      // retry for a few seconds rather than getting stuck with no spotlight.
      retryRef.current += 1;
      setTimeout(measure, 250);
    } else {
      // Genuinely not on the page right now -- skip this step rather than
      // showing a spotlight with nothing to point at.
      goNext();
    }
    // eslint-disable-next-line
  }, [currentStep, activeDiveKey]);

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

  function endTour(status) {
    setActive(false);
    setStepList([]);
    setActiveDiveKey(null);
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
      return next;
    });
  }

  function skipTour() {
    endTour('skipped');
  }

  // Start a hub-level tour run. Plain React state only -- no localStorage
  // persistence, since no step in this tour ever navigates to a different
  // page, so there is nothing that needs to survive a reload. That also
  // means an interrupted tour (tab closed mid-tour) simply doesn't resume
  // next time, rather than restarting forever on every future app open.
  function startHubTour() {
    if (active) return;
    setStepList(HUB_STEPS);
    setStepIdx(0);
    setActive(true);
    setActiveDiveKey(null);
  }

  // Start a deep-dive run for a specific feature key -- called by each
  // page's own first-visit trigger. Deliberately a no-op if a tour is
  // already running, e.g. the hub tour is mid-flight and happens to be
  // sitting on this same page -- it'll get a fair chance to auto-trigger
  // again on a later, uncontested visit instead of silently never showing
  // at all. rb_deep_dive_seen_<key> is written by measure() the moment a
  // real target is actually found and about to be shown -- not here at
  // start -- so a run whose target never loads in time doesn't get
  // permanently marked "seen" for something the user never saw.
  function startDeepDive(key) {
    if (active) return;
    var dive = DEEP_DIVES[key];
    if (!dive) return;
    setStepList(dive.steps);
    setStepIdx(0);
    setActive(true);
    setActiveDiveKey(key);
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
  var TH_ESTIMATE = 130 + (currentStep.points ? currentStep.points.length * 18 : 0);
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
            line={currentStep.line}
            points={currentStep.points}
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
              line={currentStep.line}
              points={currentStep.points}
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

function TourCardContent({ step, total, title, line, points, isLast, onNext, onSkip }) {
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
      <p className="text-sm font-bold text-gray-900 mb-1">{title}</p>
      <p className="text-xs text-gray-500 leading-snug mb-2">{line}</p>
      {points && points.length > 0 && (
        <ul className="mb-3 space-y-1">
          {points.map(function(pt, i) {
            return (
              <li key={i} className="text-[11px] text-gray-500 flex items-start gap-1.5">
                <span className="text-purple-400 leading-none mt-0.5">{'\u2022'}</span>
                <span>{pt}</span>
              </li>
            );
          })}
        </ul>
      )}
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