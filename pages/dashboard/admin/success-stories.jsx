/**
 * pages/dashboard/admin/success-stories.jsx
 * Super Admin -> Growth -> Success Stories. One workspace for the whole
 * pipeline: businesses whose own numbers show growth (Potential), invitations,
 * submitted stories, and the review decisions. Each story opens inline right
 * below its row: the owner's answers, the results frozen at submission, the
 * exact consent given, editable presentation copy, and the decision buttons.
 * Only what the owner permitted should ever be used.
 */
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import withAuth from '../../../components/withAuth';
import api from '../../../lib/api';
import { buildCardData, availableCards, renderCard, CARD_LIBRARY } from '../../../lib/successCards';

var TABS = [
  { key: 'potential',      label: 'Potential' },
  { key: 'invited',        label: 'Invited' },
  { key: 'submitted',      label: 'Submitted' },
  { key: 'under_review',   label: 'Under review' },
  { key: 'changes_needed', label: 'Changes needed' },
  { key: 'approved',       label: 'Approved' },
  { key: 'rejected',       label: 'Rejected' },
  { key: 'withdrawn',      label: 'Withdrawn' },
];

var PILL = {
  invited:        'bg-purple-50 text-purple-700',
  submitted:      'bg-blue-50 text-blue-700',
  under_review:   'bg-blue-50 text-blue-700',
  changes_needed: 'bg-amber-50 text-amber-700',
  approved:       'bg-green-50 text-green-700',
  rejected:       'bg-gray-100 text-gray-600',
  withdrawn:      'bg-gray-100 text-gray-500',
};

var PERM_LABELS = {
  testimonial:   'Written testimonial',
  business_name: 'Business name',
  results:       'Results / metrics',
  logo:          'Business logo',
};

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function tabLabel(key) {
  var t = TABS.filter(function(x) { return x.key === key; })[0];
  return t ? t.label : key;
}

function googleLine(g) {
  if (!g || !g.baseline) return 'No Google numbers';
  var s = g.baseline.review_count + (g.current ? ' \u2192 ' + g.current.review_count : '') + ' reviews';
  if (g.baseline.rating != null && g.current && g.current.rating != null) {
    s += ' \u00b7 ' + g.baseline.rating + ' \u2192 ' + g.current.rating + ' \u2605';
  }
  return s;
}

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      {children}
    </div>
  );
}

function CardsSection({ story }) {
  const data = buildCardData(story);
  const cards = availableCards(data);
  const [activeKey, setActiveKey] = useState(cards[0] ? cards[0].key : null);
  const [rendering, setRendering] = useState(false);
  const canvasRef = useState(function() { return { current: null }; })[0];

  useEffect(function() {
    setActiveKey(cards.length ? cards[0].key : null);
    // eslint-disable-next-line
  }, [story._id]);

  useEffect(function() {
    if (!activeKey || !canvasRef.current) return;
    setRendering(true);
    renderCard(canvasRef.current, activeKey, data).finally(function() { setRendering(false); });
    // eslint-disable-next-line
  }, [activeKey, story]);

  if (!data.ok) {
    return (
      <div className="border-t border-gray-100 pt-4 mt-4">
        <p className="text-xs text-gray-400">{data.reason || 'Cards are only made from approved stories.'}</p>
      </div>
    );
  }
  if (cards.length === 0) {
    return (
      <div className="border-t border-gray-100 pt-4 mt-4">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Marketing cards</p>
        <p className="text-xs text-gray-400">The owner hasn't permitted results or a testimonial, so there is nothing to turn into a card.</p>
      </div>
    );
  }

  var groups = {};
  cards.forEach(function(c) {
    groups[c.group] = groups[c.group] || [];
    groups[c.group].push(c);
  });

  function handleDownload() {
    var canvas = canvasRef.current;
    if (!canvas) return;
    var a = document.createElement('a');
    a.download = (story.business_id && story.business_id.name ? story.business_id.name.replace(/[^a-z0-9]+/gi, '-') : 'success-story') + '-' + activeKey + '.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  }

  return (
    <div className="border-t border-gray-100 pt-4 mt-4">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Marketing cards</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {Object.keys(groups).map(function(group) {
          return (
            <div key={group} className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-gray-400 mr-0.5">{group}:</span>
              {groups[group].map(function(c) {
                var active = activeKey === c.key;
                return (
                  <button key={c.key} type="button" onClick={function() { setActiveKey(c.key); }}
                    className={'text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ' +
                      (active ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300')}>
                    {c.label}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center">
        <div className="w-full max-w-[280px] rounded-lg overflow-hidden shadow-sm bg-white">
          <canvas ref={function(el) { canvasRef.current = el; }} className="w-full h-auto block" />
        </div>
        <button type="button" onClick={handleDownload} disabled={rendering}
          className="mt-3 text-xs font-semibold px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50">
          {rendering ? 'Rendering...' : 'Download PNG'}
        </button>
      </div>
      {!data.namePermitted && (
        <p className="text-[11px] text-gray-400 mt-2">The owner did not permit their business name, so cards show "A ReviewBooster customer".</p>
      )}
    </div>
  );
}

function StoryDetail({ id, onChanged }) {
  const [story,   setStory]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [headline, setHeadline] = useState('');
  const [quote,    setQuote]    = useState('');
  const [note,     setNote]     = useState('');
  const [busy,     setBusy]     = useState(false);
  const [copySaved, setCopySaved] = useState(false);

  var load = useCallback(function() {
    return api.get('/admin/success-stories/' + id)
      .then(function(res) {
        var s = res.data.data;
        setStory(s);
        setHeadline(s.presentation && s.presentation.headline ? s.presentation.headline : '');
        setQuote(s.presentation && s.presentation.quote ? s.presentation.quote : '');
        setNote('');
      })
      .catch(function() { setError('Could not load this story.'); })
      .finally(function() { setLoading(false); });
  }, [id]);

  useEffect(function() { load(); }, [load]);

  async function act(action) {
    setError('');
    setBusy(true);
    try {
      await api.patch('/admin/success-stories/' + id, {
        action: action,
        note: note,
        presentation: { headline: headline, quote: quote },
      });
      if (action === 'save_copy') {
        setCopySaved(true);
        setTimeout(function() { setCopySaved(false); }, 2500);
      } else {
        await load();
        onChanged();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="h-24 bg-gray-50 rounded-xl animate-pulse" />;
  if (!story) return <p className="text-sm text-red-500">{error || 'Story not found.'}</p>;

  var snap = story.results_snapshot;
  var act_ = snap && snap.activity ? snap.activity : null;
  var consent = story.consent;
  var perms = consent && consent.permissions ? consent.permissions : {};
  var status = story.status;
  var canDecide = status === 'submitted' || status === 'under_review';
  var btn = 'text-xs font-semibold rounded-lg px-4 py-2 transition-colors disabled:opacity-50 ';

  return (
    <div className="border border-gray-100 rounded-2xl bg-white p-5 mt-2">
      {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5 mb-4">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
        <div>
          <Field label="What changed after using ReviewBooster">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{story.what_changed || '\u2014'}</p>
          </Field>
          <Field label="Result they are happiest with">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{story.happiest_result || '\u2014'}</p>
          </Field>
          <Field label="Testimonial (optional)">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{story.testimonial || 'None given.'}</p>
          </Field>
          <Field label="Results at the time they submitted">
            {snap && snap.google ? (
              <div className="text-sm text-gray-800">
                <p>{googleLine(snap.google)}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Google numbers were typed in by the owner, not read from Google.</p>
                {act_ && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    {act_.qr_scans + ' QR scans \u00b7 ' + act_.requests_sent + ' requests sent \u00b7 ' + act_.feedback_received + ' private feedback \u00b7 ' + act_.customers + ' customers'}
                  </p>
                )}
              </div>
            ) : <p className="text-sm text-gray-400">No results attached.</p>}
          </Field>
        </div>

        <div>
          <Field label="Consent given">
            {consent ? (
              <div className="text-sm">
                <ul className="space-y-1 mb-2">
                  {Object.keys(PERM_LABELS).map(function(k) {
                    var on = perms[k] === true;
                    return (
                      <li key={k} className={on ? 'text-green-700' : 'text-gray-400'}>
                        {(on ? '\u2713 ' : '\u2717 ') + PERM_LABELS[k]}
                      </li>
                    );
                  })}
                </ul>
                <p className="text-[11px] text-gray-400">
                  {'Version ' + consent.version + ' \u00b7 given ' + fmtDate(consent.given_at) + ' by ' +
                    ((consent.given_by && (consent.given_by.name || consent.given_by.email)) || 'the owner')}
                </p>
                {story.consent_log && story.consent_log.length > 1 && (
                  <p className="text-[11px] text-gray-400">{story.consent_log.length + ' consent entries on record (grants and withdrawals).'}</p>
                )}
              </div>
            ) : <p className="text-sm text-gray-400">No consent recorded yet.</p>}
          </Field>

          <Field label="Presentation copy (your polished version)">
            <input className="input mb-2" placeholder="Headline, e.g. 65 new Google reviews in 90 days"
              maxLength={120} value={headline} onChange={function(e) { setHeadline(e.target.value); }} />
            <textarea className="input" rows={3} maxLength={600} placeholder="Quote, edited for marketing use"
              value={quote} onChange={function(e) { setQuote(e.target.value); }} />
            <p className="text-[11px] text-gray-400 mt-1">
              The owner's own words above are never changed. Only use what they permitted{perms.testimonial ? '' : ' (they did not permit their testimonial)'}.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <button type="button" disabled={busy} onClick={function() { act('save_copy'); }}
                className={btn + 'bg-gray-100 hover:bg-gray-200 text-gray-700'}>Save copy</button>
              {copySaved && <span className="text-xs text-green-600 font-medium">{'\u2713 Saved'}</span>}
            </div>
          </Field>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 mt-1">
        {canDecide || status === 'approved' || status === 'rejected' ? (
          <>
            {canDecide && (
              <textarea className="input mb-3" rows={2} maxLength={1000}
                placeholder="Note to the owner (required to request changes)"
                value={note} onChange={function(e) { setNote(e.target.value); }} />
            )}
            <div className="flex flex-wrap items-center gap-2">
              {status === 'submitted' && (
                <button type="button" disabled={busy} onClick={function() { act('start_review'); }}
                  className={btn + 'bg-blue-50 hover:bg-blue-100 text-blue-700'}>Start review</button>
              )}
              {canDecide && (
                <>
                  <button type="button" disabled={busy} onClick={function() { act('request_changes'); }}
                    className={btn + 'bg-amber-50 hover:bg-amber-100 text-amber-700'}>Request changes</button>
                  <button type="button" disabled={busy} onClick={function() { act('approve'); }}
                    className={btn + 'bg-green-600 hover:bg-green-700 text-white'}>Approve</button>
                  <button type="button" disabled={busy} onClick={function() { act('reject'); }}
                    className={btn + 'bg-gray-100 hover:bg-gray-200 text-gray-700'}>Reject</button>
                </>
              )}
              {(status === 'approved' || status === 'rejected') && (
                <button type="button" disabled={busy} onClick={function() { act('reopen'); }}
                  className={btn + 'bg-gray-100 hover:bg-gray-200 text-gray-700'}>Re-open for review</button>
              )}
            </div>
          </>
        ) : (
          <p className="text-xs text-gray-400">
            {status === 'changes_needed' ? 'Waiting for the owner to update their story.'
              : status === 'withdrawn' ? 'The owner withdrew their permission. Nothing of theirs may be used.'
              : status === 'invited' ? 'Invited. Waiting for the owner to share their story.'
              : 'No action available.'}
          </p>
        )}
      </div>

      {story.status === 'approved' && <CardsSection story={story} />}

      {story.decision_log && story.decision_log.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Decision trail</p>
          <ul className="space-y-1">
            {story.decision_log.map(function(d, i) {
              return (
                <li key={i} className="text-xs text-gray-500">
                  {fmtDate(d.at) + ' \u2014 ' + d.action.replace('_', ' ') + ' (' + d.from + ' \u2192 ' + d.to + ')' +
                    (d.by && (d.by.name || d.by.email) ? ' by ' + (d.by.name || d.by.email) : '') +
                    (d.note ? ': ' + d.note : '')}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function SuccessStoriesPage() {
  const [tab,     setTab]     = useState('submitted');
  const [rows,    setRows]    = useState([]);
  const [counts,  setCounts]  = useState({});
  const [potential, setPotential] = useState([]);
  const [rules,   setRules]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [openId,  setOpenId]  = useState(null);
  const [inviting, setInviting] = useState(null);

  var load = useCallback(function() {
    setError('');
    var calls = [api.get('/admin/success-stories'), api.get('/admin/success-stories/potential')];
    return Promise.all(calls)
      .then(function(r) {
        setRows(r[0].data.data.stories || []);
        setCounts(r[0].data.data.counts || {});
        setPotential(r[1].data.data || []);
        setRules(r[1].data.rules || null);
      })
      .catch(function() { setError('Could not load stories.'); })
      .finally(function() { setLoading(false); });
  }, []);

  useEffect(function() { load(); }, [load]);

  async function invite(businessId) {
    setInviting(businessId);
    try {
      await api.post('/admin/success-stories/invite', { business_id: businessId });
      await load();
      setTab('invited');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not invite this business.');
    } finally {
      setInviting(null);
    }
  }

  function countFor(key) {
    return key === 'potential' ? potential.length : (counts[key] || 0);
  }

  var visible = rows.filter(function(r) { return r.status === tab; });

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Success Stories</h1>
        <p className="text-xs text-gray-400 mb-5">
          Real results from your businesses, turned into marketing only with their explicit permission.
        </p>

        {error && <div className="alert-error mb-4"><span>{'\u26A0'}</span><span>{error}</span></div>}

        <div className="flex flex-wrap gap-2 mb-4">
          {TABS.map(function(t) {
            var active = tab === t.key;
            return (
              <button key={t.key} type="button"
                onClick={function() { setTab(t.key); setOpenId(null); }}
                className={'text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ' +
                  (active ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300')}>
                {t.label + ' (' + countFor(t.key) + ')'}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />
        ) : tab === 'potential' ? (
          <>
            <p className="text-xs text-gray-400 mb-3">
              {'Businesses whose own Google numbers grew' + (rules ? ' by ' + rules.min_review_gain + '+ reviews or ' + rules.min_rating_gain + '+ stars' : '') +
                ' since they started, and who have no story yet.'}
            </p>
            {potential.length === 0 ? (
              <p className="text-sm text-gray-400 bg-white rounded-2xl border border-gray-100 p-5">No businesses qualify yet. They appear once owners update their Google numbers and the growth is real.</p>
            ) : (
              <div className="space-y-2">
                {potential.map(function(p) {
                  return (
                    <div key={p.business._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.business.name}</p>
                        <p className="text-xs text-gray-500">
                          {googleLine(p.google) + ' \u00b7 +' + p.review_gain + ' reviews' + (p.rating_gain ? ', ' + (p.rating_gain > 0 ? '+' : '') + p.rating_gain + ' stars' : '')}
                        </p>
                      </div>
                      <button type="button" disabled={inviting === p.business._id} onClick={function() { invite(p.business._id); }}
                        className="text-xs font-semibold px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 shrink-0">
                        {inviting === p.business._id ? '...' : 'Invite to share'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : visible.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-2xl border border-gray-100 p-5">{'Nothing in "' + tabLabel(tab) + '" right now.'}</p>
        ) : (
          <div className="space-y-2">
            {visible.map(function(r) {
              var open = openId === r._id;
              return (
                <div key={r._id}>
                  <button type="button" onClick={function() { setOpenId(open ? null : r._id); }}
                    className={'w-full text-left bg-white rounded-2xl border shadow-sm px-5 py-3.5 flex items-center justify-between gap-3 transition-all hover:border-purple-300 ' +
                      (open ? 'border-purple-300 ring-2 ring-purple-100' : 'border-gray-100')}>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{r.business.name}</p>
                      <p className="text-xs text-gray-500">
                        {googleLine(r.google) + (r.submitted_at ? ' \u00b7 submitted ' + fmtDate(r.submitted_at) : '')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={'text-[10px] font-semibold px-2 py-0.5 rounded-full ' + (PILL[r.status] || 'bg-gray-100 text-gray-500')}>
                        {tabLabel(r.status)}
                      </span>
                      <span className="text-xs text-purple-600 font-semibold">{open ? '\u2191' : '\u2193'}</span>
                    </div>
                  </button>
                  {open && <StoryDetail id={r._id} onChanged={load} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default withAuth(SuccessStoriesPage);