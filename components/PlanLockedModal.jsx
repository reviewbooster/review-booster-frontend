/**
 * components/PlanLockedModal.jsx
 * Mounted once in DashboardLayout. Any action anywhere in the tool that the
 * plan doesn't allow (send a request, schedule a follow-up, generate an AI
 * reply, save templates, add staff/customers...) comes back from the server as
 * a PLAN_LOCKED error; lib/api.js announces it here and this drops a notice
 * down from the top with the server's message and a "See plans" button. It
 * never blocks the page. Plain page loads (GET) are shown inline by the page
 * itself instead, so they don't drop down on every visit.
 * (File keeps its old name so the import in DashboardLayout stays unchanged.)
 */
import { useState, useEffect, useRef } from 'react';
import Router from 'next/router';
import { lockedTitle } from './PlanLockedPanel';

const AUTO_HIDE_MS = 15000;

export default function PlanLockedModal() {
  const [notice, setNotice] = useState(null);
  const [shown, setShown] = useState(false);
  const autoTimer = useRef(null);
  const removeTimer = useRef(null);

  function hide() {
    setShown(false);
    if (autoTimer.current) clearTimeout(autoTimer.current);
    if (removeTimer.current) clearTimeout(removeTimer.current);
    // let the slide-up finish before removing it from the page
    removeTimer.current = setTimeout(function() { setNotice(null); }, 250);
  }

  useEffect(function() {
    function onLocked(e) {
      if (removeTimer.current) clearTimeout(removeTimer.current);
      if (autoTimer.current) clearTimeout(autoTimer.current);
      setNotice(e.detail);
      // next frame, so the slide-down transition actually runs
      requestAnimationFrame(function() { setShown(true); });
      autoTimer.current = setTimeout(hide, AUTO_HIDE_MS);
    }
    window.addEventListener('rb:plan-locked', onLocked);
    return function() {
      window.removeEventListener('rb:plan-locked', onLocked);
      if (autoTimer.current) clearTimeout(autoTimer.current);
      if (removeTimer.current) clearTimeout(removeTimer.current);
    };
    // eslint-disable-next-line
  }, []);

  if (!notice) return null;

  return (
    <div
      className="fixed left-0 right-0 top-16 md:top-4 z-[110] flex justify-center px-3 pointer-events-none"
      style={{
        transform: shown ? 'translateY(0)' : 'translateY(-140%)',
        opacity: shown ? 1 : 0,
        transition: 'transform 250ms ease-out, opacity 250ms ease-out',
      }}
    >
      <div className="pointer-events-auto w-full max-w-xl bg-white rounded-2xl shadow-xl border border-amber-200 p-4 flex items-start gap-3">
        <span className="text-xl leading-none mt-0.5">{'\uD83D\uDD12'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">{lockedTitle(notice.locked && notice.locked.reason)}</p>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{notice.message}</p>
          <button
            onClick={function() { hide(); Router.push('/dashboard/settings/billing'); }}
            className="btn-primary text-xs mt-3">
            See plans
          </button>
        </div>
        <button
          onClick={hide}
          aria-label="Close"
          className="text-gray-400 hover:text-gray-600 text-sm leading-none p-1">
          {'\u2715'}
        </button>
      </div>
    </div>
  );
}