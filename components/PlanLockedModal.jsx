/**
 * components/PlanLockedModal.jsx
 * Mounted once in DashboardLayout. Any action anywhere in the tool that the
 * plan doesn't allow (send a request, schedule a follow-up, generate an AI
 * reply, save templates, add staff/customers...) comes back from the server as
 * a PLAN_LOCKED error; lib/api.js announces it here and this shows the
 * server's message with a "See plans" button. Plain page loads (GET) are
 * shown inline by the page itself instead, so they don't pop up on every visit.
 */
import { useState, useEffect } from 'react';
import Router from 'next/router';
import { lockedTitle } from './PlanLockedPanel';

export default function PlanLockedModal() {
  const [notice, setNotice] = useState(null);

  useEffect(function() {
    function onLocked(e) {
      // Several locked requests can fire together -- keep the one already showing.
      setNotice(function(current) { return current || e.detail; });
    }
    window.addEventListener('rb:plan-locked', onLocked);
    return function() { window.removeEventListener('rb:plan-locked', onLocked); };
  }, []);

  if (!notice) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{'\uD83D\uDD12'}</span>
          <h2 className="font-bold text-gray-900">{lockedTitle(notice.locked && notice.locked.reason)}</h2>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed mb-5">{notice.message}</p>
        <div className="flex gap-3">
          <button onClick={function() { setNotice(null); }} className="btn-secondary flex-1 justify-center">Close</button>
          <button
            onClick={function() { setNotice(null); Router.push('/dashboard/settings/billing'); }}
            className="btn-primary flex-1 justify-center">
            See plans
          </button>
        </div>
      </div>
    </div>
  );
}