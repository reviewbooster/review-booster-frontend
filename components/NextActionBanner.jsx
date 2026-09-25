import { useState, useEffect } from 'react';
import Link from 'next/link';

// Every condition here reads a real signal -- a page actually visited, a
// share/download/print action actually taken, or a count that actually
// came back from the API. Nothing here is a fabricated "progress" flag.
export default function NextActionBanner({ summary }) {
  const [ready,       setReady]       = useState(false);
  const [visitedQr,   setVisitedQr]   = useState(false);
  const [qrShared,    setQrShared]    = useState(false);
  const [celebrated,  setCelebrated]  = useState(true); // safe default -- don't flash before localStorage is read

  useEffect(function() {
    try {
      setVisitedQr(localStorage.getItem('rb_visited_qr') === '1');
      setQrShared(localStorage.getItem('rb_qr_shared') === '1');
      setCelebrated(localStorage.getItem('rb_celebrated_first_review') === '1');
    } catch (e) {}
    setReady(true);
  }, []);

  if (!ready || !summary) return null;

  var hasReviews = (summary.total_reviews || 0) > 0;
  var qrScansThisPeriod = (summary.by_channel && summary.by_channel.qr) || 0;

  // First real review/feedback -- celebrate exactly once, then never again.
  if (hasReviews && !celebrated) {
    return (
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-4">
        <span className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
          <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <p className="flex-1 min-w-0 text-sm font-semibold text-emerald-700">
          {'Your first review came in \u2014 nice work!'}
        </p>
        <Link
          href="/dashboard/reviews-hub"
          onClick={function() { try { localStorage.setItem('rb_celebrated_first_review', '1'); } catch (e) {} }}
          className="shrink-0 text-xs font-semibold text-emerald-700 hover:underline"
        >
          {'Take a look \u2192'}
        </Link>
      </div>
    );
  }

  if (!visitedQr) {
    return (
      <div className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 mb-4">
        <p className="flex-1 min-w-0 text-sm font-semibold text-purple-700">
          {'Your next step: create your first QR code.'}
        </p>
        <Link href="/dashboard/qr" className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
          Set it up
        </Link>
      </div>
    );
  }

  if (!qrShared) {
    return (
      <div className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 mb-4">
        <p className="flex-1 min-w-0 text-sm font-semibold text-purple-700">
          {'Your QR is ready \u2014 now put it in front of customers.'}
        </p>
        <Link href="/dashboard/qr" className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
          Share it
        </Link>
      </div>
    );
  }

  if (!hasReviews && qrScansThisPeriod === 0) {
    return (
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4">
        <p className="flex-1 min-w-0 text-sm font-semibold text-amber-700">
          {'No scans yet \u2014 try the counter, a table, or a receipt.'}
        </p>
        <Link href="/dashboard/qr" className="shrink-0 text-xs font-semibold text-amber-700 hover:underline">
          {'Placement ideas \u2192'}
        </Link>
      </div>
    );
  }

  return null;
}