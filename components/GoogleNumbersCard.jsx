/**
 * components/GoogleNumbersCard.jsx
 * "Your results" -- the owner's own Google review count and rating (baseline
 * -> latest) next to what ReviewBooster has actually tracked since they
 * joined. ReviewBooster can't read a business's Google numbers, so those are
 * typed in by the owner and always labelled that way; the activity figures
 * are counted from real records. Nothing here is estimated.
 */
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '../lib/api';

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysSince(d) {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

// "+65" / "-2" / "" -- shown next to the latest number
function Change({ from, to, decimals }) {
  if (from == null || to == null) return null;
  var diff = Math.round((to - from) * Math.pow(10, decimals || 0)) / Math.pow(10, decimals || 0);
  if (diff === 0) return <span className="text-xs text-gray-400 ml-2">no change</span>;
  var up = diff > 0;
  return (
    <span className={'text-xs font-semibold ml-2 ' + (up ? 'text-green-600' : 'text-red-500')}>
      {(up ? '+' : '') + diff}
    </span>
  );
}

function Tile({ label, value, hint }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xl font-bold text-gray-900">{Number(value).toLocaleString('en-IN')}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export default function GoogleNumbersCard({ readOnly }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [mode,    setMode]    = useState(null);   // null | 'baseline' | 'update'
  const [count,   setCount]   = useState('');
  const [rating,  setRating]  = useState('');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  const load = useCallback(function() {
    return api.get('/business/my-results')
      .then(function(res) { setData(res.data.data); })
      .catch(function() { setError('Could not load your results. Please refresh.'); })
      .finally(function() { setLoading(false); });
  }, []);

  useEffect(function() { load(); }, [load]);

  function openForm(kind) {
    setError('');
    setCount('');
    setRating('');
    setMode(kind);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    var text = count.trim();
    if (!/^\d+$/.test(text)) {
      setError('Enter your Google review count as a whole number, e.g. 182.');
      return;
    }
    var n = parseInt(text, 10);
    var stars = Number(rating);
    if (n > 0 && !(stars >= 1 && stars <= 5)) {
      setError('Enter your Google rating between 1 and 5, e.g. 4.3.');
      return;
    }
    setSaving(true);
    try {
      await api.put('/business/my-google-numbers', {
        kind: mode,
        review_count: n,
        rating: n > 0 ? stars : null,
      });
      setMode(null);
      setSaved(true);
      setTimeout(function() { setSaved(false); }, 3000);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-40 bg-white rounded-2xl border border-gray-100 animate-pulse" />;
  }
  if (!data) {
    return error ? <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p> : null;
  }

  var g = data.google || {};
  var baseline = g.baseline;
  var current = g.current;
  var lastEntered = current ? current.entered_at : (baseline ? baseline.entered_at : null);
  var staleDays = daysSince(lastEntered);
  var activity = data.activity || {};

  var form = (
    <form onSubmit={handleSave} className="mt-3 bg-purple-50 rounded-xl p-4 space-y-3">
      <p className="text-xs text-gray-600">
        {mode === 'baseline'
          ? 'Enter the numbers your Google page shows today. This becomes your starting point.'
          : 'Enter the numbers your Google page shows today.'}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Google reviews</label>
          <input
            type="number" inputMode="numeric" min="0" value={count}
            onChange={function(e) { setCount(e.target.value); }}
            placeholder="e.g. 182"
            className="w-full bg-white rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Google rating</label>
          <input
            type="number" inputMode="decimal" step="0.1" min="1" max="5" value={rating}
            onChange={function(e) { setRating(e.target.value); }}
            placeholder="e.g. 4.3"
            className="w-full bg-white rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200" />
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg px-4 py-2 transition-colors">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={function() { setMode(null); setError(''); }}
          className="text-xs font-semibold text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </div>
    </form>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="text-sm font-semibold text-gray-900">Your results</h3>
        {saved && <span className="text-xs text-green-600 font-medium">{'\u2713 Saved'}</span>}
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Your Google numbers, and what ReviewBooster has done for you since you joined.
      </p>

      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">On Google (entered by you)</p>

      {!baseline ? (
        readOnly ? (
          <p className="text-sm text-gray-500">Your business owner hasn't entered the starting Google numbers yet.</p>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Enter your Google review count and rating as they are today. Later you can update them
              and see how much they've grown.
            </p>
            {mode === 'baseline' ? form : (
              <button type="button" onClick={function() { openForm('baseline'); }}
                className="mt-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg px-4 py-2 transition-colors">
                Enter my starting numbers
              </button>
            )}
          </>
        )
      ) : (
        <>
          <div className="divide-y divide-gray-50">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-gray-600">Google reviews</span>
              <span className="text-sm font-semibold text-gray-900">
                {baseline.review_count}
                {current ? <span>{' \u2192 ' + current.review_count}</span> : null}
                {current ? <Change from={baseline.review_count} to={current.review_count} /> : null}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-gray-600">Google rating</span>
              <span className="text-sm font-semibold text-gray-900">
                {baseline.rating != null ? baseline.rating : '\u2014'}
                {current ? <span>{' \u2192 ' + (current.rating != null ? current.rating : '\u2014')}</span> : null}
                {current ? <Change from={baseline.rating} to={current.rating} decimals={1} /> : null}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            {'Starting numbers entered by you on ' + fmtDate(baseline.entered_at) +
              (current ? '. Latest entered on ' + fmtDate(current.entered_at) + '.' : '. Update them in a month to see your progress.')}
          </p>

          {!readOnly && (
            mode ? form : (
              <div className="flex items-center gap-4 mt-3">
                <button type="button" onClick={function() { openForm('update'); }}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg px-4 py-2 transition-colors">
                  Update my numbers
                </button>
                <button type="button" onClick={function() { openForm('baseline'); }}
                  className="text-[11px] font-semibold text-gray-400 hover:text-gray-600">
                  Correct my starting numbers
                </button>
              </div>
            )
          )}
          {!readOnly && !mode && staleDays !== null && staleDays >= 30 && (
            <p className="text-xs text-amber-600 mt-2">
              {'It has been ' + staleDays + ' days since you updated these. Check your Google page and update them.'}
            </p>
          )}
        </>
      )}

      {baseline && !readOnly && (
        <div className="mt-4 bg-purple-50 rounded-xl p-3.5 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-600">Happy with your progress? Share your story with us in two minutes.</p>
          <Link href="/dashboard/settings/success-story" className="text-xs font-semibold text-purple-700 whitespace-nowrap hover:text-purple-800">
            {'Share my story \u2192'}
          </Link>
        </div>
      )}

      <div className="h-px bg-gray-100 my-5" />

      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
        {'Tracked by ReviewBooster since ' + fmtDate(data.since)}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Tile label="QR scans" value={activity.qr_scans || 0} />
        <Tile label="Review requests sent" value={activity.requests_sent || 0} />
        <Tile label="Private feedback received" value={activity.feedback_received || 0} />
        <Tile label="Sent to your Google page" value={activity.sent_to_google || 0} hint="We can't see whether they posted" />
        <Tile label="Customers collected" value={activity.customers || 0} />
      </div>
    </div>
  );
}