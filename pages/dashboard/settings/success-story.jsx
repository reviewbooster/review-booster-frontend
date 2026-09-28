/**
 * pages/dashboard/settings/success-story.jsx
 * The owner's Success Story: two short questions, an optional testimonial,
 * and explicit, separate permissions. Their results are attached
 * automatically (they don't calculate anything). Nothing is published from
 * here -- ReviewBooster reviews it first, and the owner can withdraw their
 * permission at any time.
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/DashboardLayout';
import withAuth from '../../../components/withAuth';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusNotice({ story }) {
  if (!story) return null;
  var s = story.status;
  var box = 'rounded-xl px-4 py-3 mb-5 text-sm ';
  if (s === 'submitted') {
    return <div className={box + 'bg-blue-50 text-blue-700'}>{'Submitted on ' + fmtDate(story.submitted_at) + '. Our team will review it and get back to you. You can still edit it until review starts.'}</div>;
  }
  if (s === 'under_review') {
    return <div className={box + 'bg-blue-50 text-blue-700'}>Our team is reviewing your story. Thank you!</div>;
  }
  if (s === 'changes_needed') {
    return (
      <div className={box + 'bg-amber-50 text-amber-800'}>
        <p className="font-semibold">We'd like a few changes</p>
        {story.admin_note && <p className="mt-1">{story.admin_note}</p>}
        <p className="mt-1 text-xs">Update your answers below and submit again.</p>
      </div>
    );
  }
  if (s === 'approved') {
    return <div className={box + 'bg-green-50 text-green-700'}>Approved. Thank you for sharing your story! You can withdraw your permission below at any time.</div>;
  }
  if (s === 'rejected') {
    return <div className={box + 'bg-gray-100 text-gray-600'}>We won't be using this story. Thank you for taking the time to share it.</div>;
  }
  if (s === 'withdrawn') {
    return <div className={box + 'bg-gray-100 text-gray-600'}>{'You withdrew your permission on ' + fmtDate(story.withdrawn_at) + '. Nothing of yours will be used. You can submit again below whenever you like.'}</div>;
  }
  if (s === 'invited') {
    return <div className={box + 'bg-purple-50 text-purple-700'}>You have been invited to share your story. It takes about two minutes.</div>;
  }
  return null;
}

function ResultsPreview({ results }) {
  if (!results || !results.google || !results.google.baseline) return null;
  var b = results.google.baseline;
  var c = results.google.current;
  var a = results.activity || {};
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Your results</h3>
      <p className="text-xs text-gray-400 mb-3">We attach these automatically, so there is nothing to calculate.</p>
      <div className="divide-y divide-gray-50 text-sm">
        <div className="flex justify-between py-2">
          <span className="text-gray-600">Google reviews</span>
          <span className="font-semibold text-gray-900">{b.review_count + (c ? ' \u2192 ' + c.review_count : '')}</span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-gray-600">Google rating</span>
          <span className="font-semibold text-gray-900">{(b.rating != null ? b.rating : '\u2014') + (c ? ' \u2192 ' + (c.rating != null ? c.rating : '\u2014') : '')}</span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-gray-600">Review requests sent</span>
          <span className="font-semibold text-gray-900">{a.requests_sent || 0}</span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-gray-600">Private feedback received</span>
          <span className="font-semibold text-gray-900">{a.feedback_received || 0}</span>
        </div>
      </div>
      <p className="text-[11px] text-gray-400 mt-2">
        {'Google numbers entered by you (starting ' + fmtDate(b.entered_at) + (c ? ', latest ' + fmtDate(c.entered_at) : '') + '). '}
        <Link href="/dashboard/settings/business-profile" className="text-purple-600 font-semibold">Update them</Link>
      </p>
    </div>
  );
}

function SuccessStoryPage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [info,    setInfo]    = useState(null);      // { story, consent, results, has_baseline, locked }

  const [whatChanged,    setWhatChanged]    = useState('');
  const [happiestResult, setHappiestResult] = useState('');
  const [testimonial,    setTestimonial]    = useState('');
  const [perms,          setPerms]          = useState({});
  const [declared,       setDeclared]       = useState(false);

  function fill(data) {
    var st = data.story;
    setWhatChanged(st ? st.what_changed || '' : '');
    setHappiestResult(st ? st.happiest_result || '' : '');
    setTestimonial(st ? st.testimonial || '' : '');
    setPerms(st && st.consent && st.status !== 'withdrawn' ? (st.consent.permissions || {}) : {});
    setDeclared(false);
  }

  useEffect(function() {
    if (isStaff) { setLoading(false); return; }
    api.get('/business/my-success-story')
      .then(function(res) { setInfo(res.data.data); fill(res.data.data); })
      .catch(function() { setError('Could not load this page. Please refresh.'); })
      .finally(function() { setLoading(false); });
  }, [isStaff]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.put('/business/my-success-story', {
        what_changed: whatChanged,
        happiest_result: happiestResult,
        testimonial: testimonial,
        permissions: perms,
        accepted_declaration: declared,
      });
      var res = await api.get('/business/my-success-story');
      setInfo(res.data.data);
      fill(res.data.data);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleWithdraw() {
    if (typeof window !== 'undefined' &&
        !window.confirm('Withdraw your permission? Nothing of yours will be used from now on.')) return;
    setError('');
    setSaving(true);
    try {
      await api.delete('/business/my-success-story');
      var res = await api.get('/business/my-success-story');
      setInfo(res.data.data);
      fill(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not withdraw. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  var story = info ? info.story : null;
  var locked = !!(info && info.locked);
  var statements = info ? info.consent.statements : {};
  var inputCls = 'w-full bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:opacity-70';

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-2xl">
        <Link href="/dashboard/settings/business-profile" className="text-xs font-semibold text-purple-600 hover:text-purple-700 mb-2 inline-block">
          {'\u2190 Business Profile'}
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Share your success story</h1>
        <p className="text-sm text-gray-400 mb-6">Two short questions. We supply the numbers; you supply the story.</p>

        {isStaff ? (
          <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 text-xs text-purple-700">
            Only the business owner can share a success story.
          </div>
        ) : loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : !info ? (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error || 'Something went wrong.'}</p>
        ) : !info.has_baseline ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm text-gray-700">
              Before you share a story, enter your starting Google review count and rating, so we have real numbers to show.
            </p>
            <Link href="/dashboard/settings/business-profile" className="inline-block mt-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg px-4 py-2 transition-colors">
              Enter my Google numbers
            </Link>
          </div>
        ) : (
          <>
            <StatusNotice story={story} />
            <ResultsPreview results={locked && story && story.results_snapshot ? story.results_snapshot : info.results} />

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">What changed after using ReviewBooster?</label>
                  <textarea rows={4} maxLength={1000} disabled={locked} value={whatChanged}
                    onChange={function(e) { setWhatChanged(e.target.value); }}
                    placeholder="e.g. More customers now leave reviews, and we catch complaints before they go public."
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">What result are you happiest with?</label>
                  <textarea rows={2} maxLength={500} disabled={locked} value={happiestResult}
                    onChange={function(e) { setHappiestResult(e.target.value); }}
                    placeholder="e.g. Our Google rating went up."
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Your testimonial <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea rows={3} maxLength={1500} disabled={locked} value={testimonial}
                    onChange={function(e) { setTestimonial(e.target.value); }}
                    placeholder="A few words we may quote, in your own voice."
                    className={inputCls} />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">What are you happy for us to use?</h3>
                <p className="text-xs text-gray-400 mb-3">Each one is separate. Tick only what you are comfortable with.</p>
                <div className="space-y-2">
                  {Object.keys(statements).map(function(key) {
                    return (
                      <label key={key} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-gray-50 cursor-pointer">
                        <input type="checkbox" className="mt-0.5" disabled={locked}
                          checked={!!perms[key]}
                          onChange={function(e) {
                            var next = Object.assign({}, perms);
                            next[key] = e.target.checked;
                            setPerms(next);
                          }} />
                        <span className="text-sm text-gray-700">{statements[key]}</span>
                      </label>
                    );
                  })}
                </div>
                <label className="flex items-start gap-3 mt-4 cursor-pointer">
                  <input type="checkbox" className="mt-0.5" disabled={locked} checked={declared}
                    onChange={function(e) { setDeclared(e.target.checked); }} />
                  <span className="text-xs text-gray-600">{info.consent.declaration}</span>
                </label>
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

              {!locked && (
                <div className="flex items-center gap-3 flex-wrap">
                  <button type="submit" disabled={saving}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl px-6 py-2.5 transition-colors">
                    {saving ? 'Saving...' : (story && story.status !== 'withdrawn' ? 'Update my story' : 'Submit my story')}
                  </button>
                </div>
              )}
            </form>

            {story && story.status !== 'withdrawn' && story.status !== 'rejected' && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={handleWithdraw} disabled={saving}
                  className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50">
                  Withdraw my permission
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default withAuth(SuccessStoryPage);