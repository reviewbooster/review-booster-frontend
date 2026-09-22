/**
 * pages/dashboard/feedback.jsx
 * Private Feedback page -- status tracking, urgency badges, tags, staff
 * assignment, AI reply suggestions, and a resolution trail (who resolved
 * it, and when) on resolved items.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';
import StaffPicker from '../../components/StaffPicker';
import { useAuth } from '../../context/AuthContext';
import { getDefaultTemplates } from '../../lib/defaultMessageTemplates';
import { waLinkProps } from '../../lib/waLink';

// -- Helpers ------------------------------------------------------------------
var DEFAULT_REVIEW_TEMPLATE = 'Hi {{name}}, please take a moment to share your feedback. It only takes 30 seconds!\n\n{{link}}';
function fillTemplate(template, vars) {
  var result = template;
  Object.keys(vars).forEach(function(k) {
    result = result.split('{{' + k + '}}').join(vars[k] == null ? '' : vars[k]);
  });
  return result;
}

function fmtDate(d) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(d) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

function sourceLabel(src) {
  var map = { whatsapp: 'WhatsApp', sms: 'SMS', email: 'Email', qr: 'QR Code' };
  return map[src] || src || 'Unknown';
}

function getStatus(r) {
  if (r.status === 'resolved' || r.resolved === true) return 'Resolved';
  if (r.stage === 'processing') return 'Processing';
  if (r.stage === 'awaiting_confirmation') return 'Awaiting Confirmation';
  return 'New';
}

// Private feedback is always 1-3 stars, so this only ever resolves to one of
// two labels -- derived from the rating already on the record, no guessing.
function getSentiment(rating) {
  if (rating <= 2) return 'Negative';
  if (rating === 3) return 'Neutral';
  return null;
}

function SentimentBadge({ rating }) {
  var sentiment = getSentiment(rating);
  if (!sentiment) return null;
  var styles = { 'Negative': 'bg-red-50 text-red-500', 'Neutral': 'bg-amber-50 text-amber-600' };
  return (
    <span className={'text-[10px] font-semibold px-2 py-0.5 rounded-full ' + (styles[sentiment] || 'bg-gray-100 text-gray-500')}>
      {sentiment}
    </span>
  );
}

// Static reply-draft templates (see Section 4 description) -- picking one
// calls /reviews/:id/generate-reply with { template: <key> }; no external API.
var TEMPLATE_OPTIONS = [
  { key: 'apologize',      label: '\uD83D\uDE14 Apologize' },
  { key: 'thank',          label: '\uD83D\uDC99 Thank Them' },
  { key: 'ask_details',    label: '\u2753 Ask for Details' },
  { key: 'issue_resolved', label: '\u2705 Issue Resolved' },
];

function bucketOfStage(stage) {
  return stage === 'new' ? 'new' : 'in_progress';
}

var STAGE_OPTIONS = [
  { key: 'new',                   label: 'New' },
  { key: 'processing',            label: 'Processing' },
  { key: 'awaiting_confirmation', label: 'Awaiting Confirmation' },
];

function daysToRange(days) {
  var end = new Date();
  var start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

var PERIOD_OPTIONS = [
  { days: null, label: 'All time' },
  { days: 7,    label: 'Last 7 days' },
  { days: 30,   label: 'Last 30 days' },
  { days: 90,   label: 'Last 3 months' },
];

function getPresetLabel(days) {
  if (days == null) return 'All time';
  var r = daysToRange(days);
  var fmt = function(s) { return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
  return fmt(r.start) + '\u00a0\u2013\u00a0' + fmt(r.end) + ', ' + new Date().getFullYear();
}

var SORT_OPTIONS = [
  { key: 'newest',      label: 'Newest first' },
  { key: 'oldest',      label: 'Oldest first' },
  { key: 'rating_high', label: 'Highest rating' },
  { key: 'rating_low',  label: 'Lowest rating' },
];

function StatusBadge({ status }) {
  var styles = {
    'New':                   'bg-gray-100 text-gray-500',
    'Processing':            'bg-blue-50 text-blue-500',
    'Awaiting Confirmation': 'bg-purple-50 text-purple-500',
    'Resolved':              'bg-green-50 text-green-600',
  };
  return (
    <span className={'text-[10px] font-semibold px-2 py-0.5 rounded-full ' + (styles[status] || 'bg-gray-100 text-gray-400')}>
      {status}
    </span>
  );
}

function UrgencyBadge({ item }) {
  var status   = getStatus(item);
  if (status === 'Resolved') return null;
  var rating   = item.rating || 5;
  var created  = new Date(item.created_at);
  var hoursAgo = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60));
  var daysAgo  = Math.floor(hoursAgo / 24);
  // Only surface a badge when it signals something actionable (overdue/urgent);
  // a plain "just arrived" pill duplicated the "New" status badge, so it's dropped.
  if (rating <= 2) {
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">{'Urgent'}</span>;
  }
  if (daysAgo >= 3) {
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">{daysAgo + 'd overdue'}</span>;
  }
  if (daysAgo >= 1) {
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-500">{daysAgo + 'd old'}</span>;
  }
  return null;
}

function StarRow({ rating }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map(function(s) {
        return (
          <span key={s} style={{ color: s <= (rating || 0) ? '#FBBF24' : '#E5E7EB', fontSize: '13px' }}>
            {'\u2605'}
          </span>
        );
      })}
    </span>
  );
}

function TagBadges({ tags }) {
  if (!tags || tags.length === 0) return null;
  // Tags are categorical, not severity signals -- one flat neutral style
  // instead of a different hue per tag keeps status/urgency the only color cues.
  return (
    <>
      {tags.map(function(t) {
        return (
          <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            {t}
          </span>
        );
      })}
    </>
  );
}

function buildPages(page, total) {
  if (total <= 6) return Array.from({ length: total }, function(_, i) { return i + 1; });
  if (page <= 3)       return [1, 2, 3, '_d1', total];
  if (page >= total-2) return [1, '_d1', total-2, total-1, total];
  return [1, '_d1', page-1, page, page+1, '_d2', total];
}

// -- Detail / Reply modal -----------------------------------------------------
function FeedbackDetailModal({ item, onClose, onResolve, resolving, isStaff, onStageChange, onMarkSent })  {
  const [reply,  setReply]  = useState('');
  const [copied, setCopied] = useState(false);
  const [suggesting, setSuggesting] = useState(null); // null, or the template key currently loading
  const [suggestError, setSuggestError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [resendLink, setResendLink] = useState(null);
  const [resolvedBy, setResolvedBy] = useState(null);
  const [updatingStage, setUpdatingStage] = useState(false);
  const [resolvedFollowupTemplate, setResolvedFollowupTemplate] = useState('');
  const [customerContext, setCustomerContext] = useState(null);
  const [composingNew, setComposingNew] = useState(false);
  const lastSentAtRef = useRef(item.reply_sent_at);

  useEffect(function() {
    api.get('/business/my-settings').then(function(res) {
      var biz = res.data && res.data.data;
      var mt = biz && biz.message_templates;
      if (mt && mt.resolved_followup) {
        setResolvedFollowupTemplate(mt.resolved_followup);
      } else if (biz && biz.type) {
        setResolvedFollowupTemplate(getDefaultTemplates(biz.type).resolved_followup);
      }
    }).catch(function() {});
  }, []);

  useEffect(function() {
    api.get('/reviews/' + item._id + '/customer-context').then(function(res) {
      setCustomerContext(res.data && res.data.data ? res.data.data : null);
    }).catch(function() {});
  }, [item._id]);

  // Once a send actually lands (item.reply_sent_at changes because the
  // parent refreshed it after mark-sent succeeded), collapse back out of
  // "composing" mode so the sent-summary card takes over.
  useEffect(function() {
    if (item.reply_sent_at !== lastSentAtRef.current) {
      lastSentAtRef.current = item.reply_sent_at;
      setComposingNew(false);
    }
  }, [item.reply_sent_at]);

    const [notes, setNotes] = useState(item.internal_notes || '');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  var status       = getStatus(item);
  var customer     = (item.customer_id && typeof item.customer_id === 'object') ? item.customer_id : null;
  var customerName = (customer && customer.name) ? customer.name : 'Anonymous';

  // Includes the customer\'s original feedback as context above the
  // owner\'s reply, so the customer isn\'t confused about why/where a
  // message is coming from when they get it on WhatsApp/SMS.
  var buildContextualMessage = function() {
    var parts = [];
    if (item.feedback_text && item.feedback_text.trim()) {
      parts.push('Your feedback:');
      parts.push('"' + item.feedback_text.trim() + '"');
      parts.push('');
    }
    parts.push('Our reply:');
    parts.push(reply);
    return parts.join('\n');
  };

  var handleCopy = function() {
    if (!reply.trim()) return;
    navigator.clipboard.writeText(reply).then(function() {
      setCopied(true);
      setTimeout(function() { setCopied(false); }, 2000);
    });
  };

  var handleSuggestReply = function(template) {
    setSuggesting(template);
    setSuggestError('');
    api.post('/reviews/' + item._id + '/generate-reply', { template: template })
      .then(function(res) { setReply(res.data?.data?.draft || ''); })
      .catch(function(err) { setSuggestError(err.response?.data?.error || 'Failed to generate a suggestion.'); })
      .finally(function() { setSuggesting(null); });
  };

  var handleResend = function() {
    if (!customer) return;
    setResending(true);
    setResendMsg('');
    setResendLink(null);
    var channel = customer.phone ? 'whatsapp' : 'email';
    api.post('/requests', { customer_id: customer._id, channel: channel })
      .then(function(res) {
        var reviewUrl = res.data && res.data.review_url;
        var msg = fillTemplate(resolvedFollowupTemplate || 'Hi {{name}}, we have resolved the issue you mentioned earlier and hope things are looking better now. If you are happy with how it was handled, we would really appreciate an updated review \u2014 it means a lot to us.\n\n{{link}}', { name: customerName, link: reviewUrl });
        if (channel === 'whatsapp') {
          setResendLink({ url: 'https://wa.me/' + customer.phone.replace(/^\+/, '') + '?text=' + encodeURIComponent(msg), label: 'Tap to open WhatsApp' });
          setResendMsg('Opening WhatsApp to send it\u2026');
        } else {
          setResendLink({ url: 'mailto:' + customer.email + '?subject=' + encodeURIComponent('We would love your feedback!') + '&body=' + encodeURIComponent(msg), label: 'Tap to open Email' });
          setResendMsg('Opening your email app to send it\u2026');
        }
      })
      .catch(function(err) { setResendMsg(err.response?.data?.error || 'Failed to resend.'); })
      .finally(function() { setResending(false); });
  };

  var handleSaveNotes = function() {
    setNotesSaving(true);
    api.patch('/reviews/' + item._id + '/notes', { notes: notes })
      .then(function() { setNotesSaved(true); setTimeout(function() { setNotesSaved(false); }, 3000); })
      .catch(function() {})
      .finally(function() { setNotesSaving(false); });
  };

  var hasDirectChannel = !!(customer && (customer.phone || customer.email));

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-md max-h-[90vh] flex flex-col animate-slide-up">

        {/* Sticky header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-900">Feedback Details</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">{'\u2715'}</button>
        </div>

        {/* Scrollable body */}
        <div className="p-5 overflow-y-auto">

          {/* Customer profile row */}
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm shrink-0">
              {customerName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <p className="text-sm font-semibold text-gray-900">{customerName}</p>
                <StatusBadge status={status} />
                <SentimentBadge rating={item.rating} />
                <UrgencyBadge item={item} />
                <TagBadges tags={item.tags} />
              </div>
              <StarRow rating={item.rating} />
              {customer && customer.phone && (
                <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5">
                  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {customer.phone}
                </p>
              )}
              {customer && customer.email && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {customer.email}
                </p>
              )}
              {customer && customer._id && (
                <a href={'/dashboard/customers/' + customer._id}
                  className="text-xs text-purple-600 font-semibold mt-2 inline-flex items-center gap-0.5 hover:underline"
                  target="_blank" rel="noopener noreferrer">
                  {'View Customer \u2192'}
                </a>
              )}
            </div>
          </div>

          {/* Customer history -- only shown when we have real data to back it,
              never a made-up number. Comes from customer-context, fetched
              once when the modal opens (not on every list row). */}
          {customer && customerContext && (customerContext.total_reviews > 0 || customerContext.customer_since) && (
            <div className="flex items-center gap-3 text-[11px] text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-3 flex-wrap">
              {customerContext.total_reviews > 0 && (
                <span>{customerContext.total_reviews + ' total review' + (customerContext.total_reviews === 1 ? '' : 's')}</span>
              )}
              {customerContext.customer_since && (
                <span>{'Customer since ' + fmtDate(customerContext.customer_since)}</span>
              )}
              {customerContext.last_contacted && (
                <span>{'Last contacted ' + fmtDate(customerContext.last_contacted)}</span>
              )}
            </div>
          )}

          {/* Their feedback */}
          <div className="bg-gray-50 rounded-xl p-4 mb-3">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">
              {'Their Feedback'}
            </p>
            {item.feedback_text ? (
              <p className="text-sm text-gray-700 leading-relaxed">{item.feedback_text}</p>
            ) : (
              <p className="text-xs text-gray-400 italic">No written feedback provided.</p>
            )}
          </div>

          <p className="text-xs text-gray-400 mb-2">
            {fmtDate(item.created_at) + ' \u00b7 via ' + sourceLabel(item.source)}
          </p>

          {/* Resolution trail */}
          {status === 'Resolved' && (
            <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2 mb-3 flex items-center gap-1.5">
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {item.resolved_by
                ? 'Resolved by ' + item.resolved_by + (item.resolved_at ? ' on ' + fmtDate(item.resolved_at) : '')
                : 'Marked as resolved' + (item.resolved_at ? ' on ' + fmtDate(item.resolved_at) : '')}
            </p>
          )}

          {customer && (customer.phone || customer.email) ? (
            <div className="mb-5">
              {item.reply_sent_at && !composingNew ? (
                <div className="bg-green-50 rounded-xl p-3.5">
                  <p className="text-[10px] text-green-700 font-semibold flex items-center gap-1 mb-1.5">
                    <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {'Sent via ' + sourceLabel(item.reply_channel) + ' \u00b7 ' + fmtDateTime(item.reply_sent_at)}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {item.reply_text || '(Message text wasn\u2019t recorded for this one -- only replies sent after this update are saved.)'}
                  </p>
                  {!isStaff && status !== 'Resolved' && (
                    <button type="button" onClick={function() { setComposingNew(true); }}
                      className="text-[10px] font-semibold text-purple-600 hover:text-purple-700 mt-2">
                      {'Send another reply'}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Your Reply</label>
                  {!isStaff && (
                    <div className="flex gap-1.5 mb-2 flex-wrap">
                      {TEMPLATE_OPTIONS.map(function(t) {
                        return (
                          <button
                            key={t.key}
                            type="button"
                            onClick={function() { handleSuggestReply(t.key); }}
                            disabled={!!suggesting}
                            className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600 disabled:opacity-50 flex items-center gap-1 transition-colors">
                            {suggesting === t.key ? <><span className='spinner' /> {'\u2026'}</> : t.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {suggestError && <p className="text-[10px] text-red-500 mb-1.5">{suggestError}</p>}
                  <textarea
                    value={reply}
                    onChange={function(e) { setReply(e.target.value); }}
                    placeholder={'Hi ' + customerName + ', thank you for your feedback\u2026'}
                    rows={4}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 placeholder-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
                  />
                  <div className="flex gap-2 mt-2">
                    {customer.phone && (
                      <a href={'https://wa.me/' + customer.phone.replace(/^\+/, '') + '?text=' + encodeURIComponent(buildContextualMessage())} {...waLinkProps()} onClick={function() { if (reply.trim() && onMarkSent) onMarkSent(item._id, 'whatsapp', reply); }} className={'flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold py-3 rounded-xl transition-colors ' + (reply.trim() ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-100 text-gray-300 pointer-events-none')}>
                        WhatsApp
                      </a>
                    )}
                    {customer.phone && (
                      <a href={'sms:' + customer.phone + '?body=' + encodeURIComponent(buildContextualMessage())} onClick={function() { if (reply.trim() && onMarkSent) onMarkSent(item._id, 'sms', reply); }} className={'flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold py-3 rounded-xl transition-colors ' + (reply.trim() ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-gray-100 text-gray-300 pointer-events-none')}>
                        SMS
                      </a>
                    )}
                    {customer.email && (
                      <a href={'mailto:' + customer.email + '?subject=' + encodeURIComponent('Following up on your feedback') + '&body=' + encodeURIComponent(buildContextualMessage())} onClick={function() { if (reply.trim() && onMarkSent) onMarkSent(item._id, 'email', reply); }} className={'flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold py-3 rounded-xl transition-colors ' + (reply.trim() ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-100 text-gray-300 pointer-events-none')}>
                        Email
                      </a>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5 text-center">{'Opens with your reply pre-filled.'}</p>
                </>
              )}
            </div>
          ) : (
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Notes</label>
              <p className='text-[10px] text-gray-400 mb-1.5'>{'No contact info on file for this customer \u2014 add a private note instead. This is never sent to the customer.'}</p>
              <textarea
                value={notes}
                onChange={function(e) { setNotes(e.target.value); }}
                placeholder="Add an internal note about this feedback..."
                rows={4}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 placeholder-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
              />
              <button
                onClick={handleSaveNotes}
                disabled={notesSaving}
                className="w-full mt-2 flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-xl transition-colors bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50">
                {notesSaving ? 'Saving...' : (notesSaved ? '\u2713 Saved' : 'Save Note')}
              </button>
            </div>
          )}

          {status !== 'Resolved' && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Stage</p>
              <div className="flex gap-1.5">
                {STAGE_OPTIONS.map(function(s) {
                  var isCurrent = (item.stage || 'new') === s.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={function() {
                        onStageChange && onStageChange(item._id, s.key);
                        if (s.key === 'awaiting_confirmation' && !reply.trim() && customer && (customer.phone || customer.email)) {
                          setReply('Hi ' + customerName + ', we hope we\'ve been able to resolve your concern! Could you let us know if everything looks good now?');
                        }
                      }}
                      disabled={updatingStage}
                      className={'flex-1 text-[10px] font-semibold py-2 px-1 rounded-lg transition-colors ' +
                        (isCurrent ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resolve + Close */}
          {status !== 'Resolved' && onResolve && (
            <>
              <StaffPicker value={resolvedBy} onChange={setResolvedBy} label="Who's handling this? (optional)" />
              <button
                onClick={function() { onResolve(item._id, resolvedBy); }}
                disabled={resolving === item._id}
                className="w-full text-sm font-semibold py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white transition-colors mb-2 flex items-center justify-center gap-1.5">
                {resolving === item._id ? <><span className="spinner" />{' Marking\u2026'}</> : '\u2713 Mark as Resolved'}
              </button>
            </>
          )}
          {!isStaff && status === 'Resolved' && (
            <>
              <button
                onClick={handleResend}
                disabled={resending || !hasDirectChannel}
                className="btn-primary w-full justify-center mb-2">
                {resending ? <><span className="spinner" />{' Sending\u2026'}</> : '\u21BB Resend Request'}
              </button>
              {resendMsg && <p className="text-xs text-center text-gray-500 mb-2">{resendMsg}</p>}
              {resendLink && (
                <a href={resendLink.url} {...waLinkProps()}
                  className="btn-primary w-full justify-center mb-2 flex items-center justify-center gap-1.5">
                  {resendLink.label}
                </a>
              )}
              {!hasDirectChannel && <p className="text-xs text-center text-gray-400 mb-2">No contact info on file to resend to.</p>}
            </>
          )}
          <button onClick={onClose} className="btn-secondary w-full justify-center">Close</button>
        </div>
      </div>
    </div>
  );
}

// -- Main page ----------------------------------------------------------------
function FeedbackPage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';
  const [activeTab,   setActiveTab]   = useState('new');
  const [items,       setItems]       = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState('');
  const [filter,      setFilter]      = useState({ rating: '', channel: '', tag: '' });
  const [sort,        setSort]        = useState('newest');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [dateMode,     setDateMode]     = useState('preset');
  const [selectedDays, setSelectedDays] = useState(null);
  const [customDaysInput, setCustomDaysInput] = useState('');
  const [rangeStart,   setRangeStart]   = useState('');
  const [rangeEnd,     setRangeEnd]     = useState('');
  const [rangeError,   setRangeError]   = useState('');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [fetching,    setFetching]    = useState(false);
  const [error,       setError]       = useState('');
  const [counts,      setCounts]      = useState({ new: 0, in_progress: 0, resolved: 0 });
  const [countsReady, setCountsReady] = useState(false);
  const [tagOptions,  setTagOptions]  = useState([]);
  const [resolving,   setResolving]   = useState(null);
  const [viewItem,    setViewItem]    = useState(null);

  const dateDropdownRef = useRef(null);
  const sortMenuRef     = useRef(null);
  const firstLoadRef    = useRef(true);
  const LIMIT = 10;
  const today = new Date().toISOString().slice(0, 10);

  useEffect(function() {
    Promise.all([
      api.get('/reviews/private?limit=1&is_resolved=false&stage=new'),
      api.get('/reviews/private?limit=1&is_resolved=false&stage=in_progress'),
      api.get('/reviews/private?limit=1&is_resolved=true'),
    ]).then(function(results) {
      setCounts({
        new:         results[0].data.total || 0,
        in_progress: results[1].data.total || 0,
        resolved:    results[2].data.total || 0,
      });
      setCountsReady(true);
    }).catch(function() { setCountsReady(true); });
  }, []);

  useEffect(function() {
    api.get('/reviews/tags').then(function(res) {
      setTagOptions(res.data && res.data.data ? res.data.data : []);
    }).catch(function() {});
  }, []);

  useEffect(function() {
    function handler(e) {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target)) setDateDropdownOpen(false);
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) setSortMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return function() { document.removeEventListener('mousedown', handler); };
  }, []);

  const buildFilterParams = useCallback(function() {
    var params = new URLSearchParams();
    if (filter.rating)  params.set('rating', filter.rating);
    if (filter.channel) params.set('channel', filter.channel);
    if (filter.tag)      params.set('tag', filter.tag);
    if (search)          params.set('search', search);
    if (dateMode === 'range' && rangeStart && rangeEnd) {
      params.set('start_date', rangeStart);
      params.set('end_date', rangeEnd);
    } else if (dateMode === 'preset' && selectedDays != null) {
      var r = daysToRange(selectedDays);
      params.set('start_date', r.start);
      params.set('end_date', r.end);
    }
    return params;
  }, [filter, search, dateMode, selectedDays, rangeStart, rangeEnd]);

  const load = useCallback(async function() {
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      setLoading(true);
    } else {
      setFetching(true);
    }
    setError('');
    try {
      var params = buildFilterParams();
      params.set('page', page);
      params.set('limit', LIMIT);
      params.set('sort', sort);
      if (activeTab === 'resolved') {
        params.set('is_resolved', 'true');
      } else if (activeTab === 'new') {
        params.set('is_resolved', 'false');
        params.set('stage', 'new');
      } else if (activeTab === 'in_progress') {
        params.set('is_resolved', 'false');
        params.set('stage', 'in_progress');
      }
      var res = await api.get('/reviews/private?' + params.toString());
      setItems(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (e) {
      setError('Failed to load feedback.');
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [page, activeTab, sort, buildFilterParams]);

  useEffect(function() { load(); }, [load]);

  var handleTabChange = function(tab) { setActiveTab(tab); setPage(1); };
  var handleFilterChange = function(key, val) {
    setFilter(function(f) { return Object.assign({}, f, { [key]: val }); });
    setPage(1);
  };
  var handleSearch = function(val) { setSearch(val); setPage(1); };

  var handleClearAll = function() {
    setFilter({ rating: '', channel: '', tag: '' });
    setSearch('');
    setSort('newest');
    setDateMode('preset');
    setSelectedDays(null);
    setRangeStart('');
    setRangeEnd('');
    setPage(1);
  };

  var handleCustomDaysApply = function() {
    var n = parseInt(customDaysInput, 10);
    if (n >= 1 && n <= 365) {
      setDateMode('preset');
      setSelectedDays(n);
      setDateDropdownOpen(false);
      setCustomDaysInput('');
      setPage(1);
    }
  };

  var handleRangeApply = function() {
    if (!rangeStart || !rangeEnd) { setRangeError('Pick both a start and end date.'); return; }
    if (rangeStart > rangeEnd)    { setRangeError('Start date must be before end date.'); return; }
    setRangeError('');
    setDateMode('range');
    setDateDropdownOpen(false);
    setPage(1);
  };

  var handleStageChange = async function(id, stage) {
    try {
      await api.patch('/reviews/' + id + '/stage', { stage: stage });
      var prevItem = items.find(function(r) { return r._id === id; }) || viewItem;
      var oldBucket = bucketOfStage(prevItem ? (prevItem.stage || 'new') : 'new');
      var newBucket = bucketOfStage(stage);

      setItems(function(prev) {
        return prev.map(function(r) { return r._id === id ? Object.assign({}, r, { stage: stage }) : r; });
      });
      setViewItem(function(prev) {
        return prev && prev._id === id ? Object.assign({}, prev, { stage: stage }) : prev;
      });

      if (oldBucket !== newBucket) {
        setCounts(function(prev) {
          var next = Object.assign({}, prev);
          next[oldBucket] = Math.max(0, next[oldBucket] - 1);
          next[newBucket] = next[newBucket] + 1;
          return next;
        });
        // If the item just moved out of the tab currently being viewed
        // (New or In Progress), drop it from the visible list without a refetch.
        if (activeTab === oldBucket) {
          setItems(function(prev) { return prev.filter(function(r) { return r._id !== id; }); });
          setTotal(function(t) { return Math.max(0, t - 1); });
        }
      }
    } catch (e) {
      // best-effort
    }
  };

  var handleMarkSent = async function(id, channel, replyText) {
    try {
      var res = await api.patch('/reviews/' + id + '/mark-sent', { channel: channel, reply_text: replyText });
      var updated = (res.data && res.data.data) || {};
      var newStage = updated.stage || 'awaiting_confirmation';
      var replySentAt = updated.reply_sent_at || new Date().toISOString();
      var storedReplyText = updated.reply_text != null ? updated.reply_text : (replyText || null);

      var prevItem = items.find(function(r) { return r._id === id; }) || viewItem;
      var oldBucket = bucketOfStage(prevItem ? (prevItem.stage || 'new') : 'new');
      var newBucket = bucketOfStage(newStage);

      setItems(function(prev) {
        return prev.map(function(r) { return r._id === id ? Object.assign({}, r, { stage: newStage, reply_sent_at: replySentAt, reply_channel: channel, reply_text: storedReplyText }) : r; });
      });
      setViewItem(function(prev) {
        return prev && prev._id === id ? Object.assign({}, prev, { stage: newStage, reply_sent_at: replySentAt, reply_channel: channel, reply_text: storedReplyText }) : prev;
      });

      if (oldBucket !== newBucket) {
        setCounts(function(prev) {
          var next = Object.assign({}, prev);
          next[oldBucket] = Math.max(0, next[oldBucket] - 1);
          next[newBucket] = next[newBucket] + 1;
          return next;
        });
        if (activeTab === oldBucket) {
          setItems(function(prev) { return prev.filter(function(r) { return r._id !== id; }); });
          setTotal(function(t) { return Math.max(0, t - 1); });
        }
      }
    } catch (e) {
      // best-effort -- the wa.me/sms/mailto link still opens even if this tracking call fails
    }
  };

  var markResolved = async function(id, resolvedBy) {
    setResolving(id);
    try {
      await api.patch('/reviews/' + id + '/resolve', resolvedBy ? { resolved_by: resolvedBy } : {});
      var resolvedItem = items.find(function(r) { return r._id === id; }) || viewItem;
      var bucket = bucketOfStage(resolvedItem ? (resolvedItem.stage || 'new') : 'new');
      setItems(function(prev) { return prev.filter(function(r) { return r._id !== id; }); });
      setTotal(function(t) { return Math.max(0, t - 1); });
      setCounts(function(prev) {
        var next = Object.assign({}, prev);
        next[bucket] = Math.max(0, next[bucket] - 1);
        next.resolved = next.resolved + 1;
        return next;
      });
      setViewItem(null);
    } catch (e) {
      // silently ignore
    } finally {
      setResolving(null);
    }
  };

  var hasActiveFilters = !!(filter.rating || filter.channel || filter.tag || search || dateMode === 'range' || (dateMode === 'preset' && selectedDays != null) || sort !== 'newest');
  var dateLabel = dateMode === 'range' && rangeStart && rangeEnd
    ? new Date(rangeStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + '\u00a0\u2013\u00a0' + new Date(rangeEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : getPresetLabel(selectedDays);

  var totalPages = Math.ceil(total / LIMIT);

  var TABS = [
    { key: 'new',         label: 'Unresolved',  count: counts.new },
    { key: 'in_progress', label: 'In Progress', count: counts.in_progress },
    { key: 'resolved',    label: 'Resolved',    count: counts.resolved },
  ];

  return (
    <DashboardLayout>

      {viewItem && (
        <FeedbackDetailModal
          item={viewItem}
          onClose={function() { setViewItem(null); }}
          onResolve={markResolved}
          resolving={resolving}
          isStaff={isStaff}
          onStageChange={handleStageChange}
          onMarkSent={handleMarkSent} />
      )}

      {/* Tab bar */}
      <div className="flex items-center border-b border-gray-200 mb-4">
        <div className="flex flex-1">
          {TABS.map(function(tab) {
            return (
              <button
                key={tab.key}
                onClick={function() { handleTabChange(tab.key); }}
                className={'pb-3 mr-5 text-sm font-semibold border-b-2 -mb-px transition-colors duration-150 ' +
                  (activeTab === tab.key
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600')}>
                {tab.label + (countsReady ? ' (' + tab.count + ')' : '')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Unified toolbar: search + filters + sort */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-0" ref={sortMenuRef}>
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
          </span>
          <input
            className="w-full bg-gray-100 rounded-xl pl-10 pr-10 py-3 text-base sm:text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-200 transition"
            placeholder="Search feedback..."
            value={search}
            onChange={function(e) { handleSearch(e.target.value); }} />
          <button
            type="button"
            onClick={function() { setSortMenuOpen(!sortMenuOpen); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 p-1 rounded-lg transition-colors">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 9h10M11 14h2" />
            </svg>
          </button>
          {sortMenuOpen && (
            <div className="absolute right-0 top-full mt-2 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 w-44">
              {SORT_OPTIONS.map(function(opt) {
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={function() { setSort(opt.key); setSortMenuOpen(false); setPage(1); }}
                    className={'w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ' +
                      (sort === opt.key ? 'text-purple-600 font-semibold' : 'text-gray-600')}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="relative shrink-0" ref={dateDropdownRef}>
          <button
            onClick={function() { setDateDropdownOpen(!dateDropdownOpen); }}
            className={'flex items-center gap-1.5 bg-white border rounded-xl px-3.5 py-3 text-[12px] font-medium transition-colors ' +
              (dateDropdownOpen || hasActiveFilters ? 'border-purple-400 text-purple-600' : 'border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600')}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18l-7 9v6l-4 2v-8L3 4z" />
            </svg>
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[9px] font-bold flex items-center justify-center">
                {'\u2713'}
              </span>
            )}
          </button>
          {dateDropdownOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 bg-white rounded-xl border border-gray-100 shadow-lg z-50 overflow-hidden"
              style={{ width: '280px' }}>

              <div className="p-4 space-y-3 border-b border-gray-100">
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Rating</label>
                  <select
                    value={filter.rating}
                    onChange={function(e) { handleFilterChange('rating', e.target.value); }}
                    className="w-full bg-gray-100 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-700 outline-none focus:ring-2 focus:ring-purple-200">
                    <option value="">All Ratings</option>
                    {[3, 2, 1].map(function(r) {
                      return <option key={r} value={r}>{r + ' Star' + (r !== 1 ? 's' : '')}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Channel</label>
                  <select
                    value={filter.channel}
                    onChange={function(e) { handleFilterChange('channel', e.target.value); }}
                    className="w-full bg-gray-100 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-700 outline-none focus:ring-2 focus:ring-purple-200">
                    <option value="">All Channels</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                    <option value="qr">QR Code</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Category</label>
                  <select
                    value={filter.tag}
                    onChange={function(e) { handleFilterChange('tag', e.target.value); }}
                    className="w-full bg-gray-100 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-700 outline-none focus:ring-2 focus:ring-purple-200">
                    <option value="">All Categories</option>
                    {tagOptions.map(function(t) {
                      return <option key={t} value={t}>{t}</option>;
                    })}
                  </select>
                </div>
              </div>

              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-4 pt-3 pb-1">Date range</p>
              {PERIOD_OPTIONS.map(function(opt) {
                return (
                  <button
                    key={opt.label}
                    onClick={function() { setDateMode('preset'); setSelectedDays(opt.days); setPage(1); }}
                    className={'w-full text-left px-4 py-2 text-[12px] font-medium transition-colors ' +
                      (dateMode === 'preset' && selectedDays === opt.days ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50')}>
                    {opt.label}
                  </button>
                );
              })}
              <div className="border-t border-gray-100 px-4 py-2.5">
                <label className="text-[10px] font-semibold text-gray-400 block mb-1.5">Custom (days)</label>
                <div className="flex gap-1.5">
                  <input
                    type="number" min={1} max={365} placeholder="e.g. 4"
                    value={customDaysInput}
                    onChange={function(e) { setCustomDaysInput(e.target.value); }}
                    onKeyDown={function(e) { if (e.key === 'Enter') handleCustomDaysApply(); }}
                    className="w-full bg-gray-100 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-700 outline-none focus:ring-2 focus:ring-purple-200 min-w-0" />
                  <button onClick={handleCustomDaysApply}
                    className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold px-3 rounded-lg transition-colors">
                    Go
                  </button>
                </div>
              </div>
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-2">Custom date range</label>
                {rangeError && <p className="text-[10px] text-red-500 mb-1.5">{rangeError}</p>}
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] text-gray-400 block mb-0.5">From</span>
                    <input type="date" value={rangeStart} max={rangeEnd || today}
                      onChange={function(e) { setRangeStart(e.target.value); setRangeError(''); }}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] text-gray-700 outline-none focus:ring-2 focus:ring-purple-200 min-w-0" />
                  </div>
                  <span className="text-gray-300 text-xs mt-3">{'\u2192'}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] text-gray-400 block mb-0.5">To</span>
                    <input type="date" value={rangeEnd} min={rangeStart} max={today}
                      onChange={function(e) { setRangeEnd(e.target.value); setRangeError(''); }}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] text-gray-700 outline-none focus:ring-2 focus:ring-purple-200 min-w-0" />
                  </div>
                </div>
                <button onClick={handleRangeApply}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold py-2 rounded-lg transition-colors mb-2">
                  Apply Range
                </button>
                <button onClick={function() { setDateDropdownOpen(false); }}
                  className="w-full text-gray-500 hover:text-gray-700 text-[11px] font-semibold py-1.5 transition-colors">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            title="Clear all filters"
            className="shrink-0 flex items-center justify-center w-11 h-11 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors">
            {'\u2715'}
          </button>
        )}
      </div>

      {error && <div className="alert-error mb-4"><span>{'\u26A0'}</span><span>{error}</span></div>}

      {/* List */}
      <div className={'bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 transition-opacity duration-150 ' +
        (fetching ? 'opacity-50 pointer-events-none' : '')}>
        {loading ? (
          Array.from({ length: 4 }).map(function(_, i) {
            return (
              <div key={i} className="flex items-start gap-3 px-4 py-4 border-b border-gray-100 last:border-0">
                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="flex gap-2">
                    <div className="h-3.5 bg-gray-200 rounded-full animate-pulse w-20" />
                    <div className="h-4 bg-gray-100 rounded-full animate-pulse w-14" />
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full animate-pulse w-16" />
                  <div className="h-3 bg-gray-100 rounded-full animate-pulse w-52" />
                  <div className="h-3 bg-gray-100 rounded-full animate-pulse w-36" />
                </div>
              </div>
            );
          })
        ) : items.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center px-6">
            <p className="text-4xl mb-3">{activeTab === 'resolved' ? '\u2713' : '\u2705'}</p>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              {hasActiveFilters ? 'No matching feedback' : (activeTab === 'resolved' ? 'No resolved feedback yet' : 'All caught up!')}
            </p>
            <p className="text-xs text-gray-400">
              {hasActiveFilters ? 'Try adjusting your filters.' : (activeTab === 'resolved' ? 'Resolved items will appear here.' : 'No feedback needs attention right now.')}
            </p>
          </div>
        ) : (
          items.map(function(r) {
            var status     = getStatus(r);
            var isResolved = status === 'Resolved';
            return (
              <div key={r._id}
                className="flex items-start gap-3 px-4 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors duration-100">

                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm shrink-0 mt-0.5">
                  {((r.customer_id && r.customer_id.name) ? r.customer_id.name : 'A').charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name + badges row */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">
                      {(r.customer_id && r.customer_id.name) ? r.customer_id.name : 'Anonymous'}
                    </p>
                    <StatusBadge status={status} />
                    <SentimentBadge rating={r.rating} />
                    <UrgencyBadge item={r} />
                    <TagBadges tags={r.tags} />
                  </div>

                  <StarRow rating={r.rating} />

                  {r.feedback_text && (
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed"
                      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {r.feedback_text}
                    </p>
                  )}

                  {isResolved && r.resolved_by && (
                    <p className="text-[10px] text-green-600 mt-1">
                      {'\u2713 Resolved by ' + r.resolved_by + (r.resolved_at ? ' \u00b7 ' + fmtDate(r.resolved_at) : '')}
                    </p>
                  )}

                  {/* Date + action buttons row */}
                  <div className="flex flex-col gap-2 mt-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[10px] text-gray-400 shrink-0">
                      {fmtDate(r.created_at) + ' \u00b7 via ' + sourceLabel(r.source)}
                    </p>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {r.customer_id && r.customer_id.phone && (
                        <a href={'tel:' + r.customer_id.phone}
                          onClick={function(e) { e.stopPropagation(); }}
                          title="Call customer"
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors">
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </a>
                      )}
                      <button
                        onClick={function() { setViewItem(r); }}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors">
                        {'Open'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400 order-2 sm:order-1">
            {'Showing ' + ((page-1)*LIMIT+1) + ' to ' + Math.min(page*LIMIT, total) + ' of ' + total.toLocaleString()}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-0.5 order-1 sm:order-2">
              <button onClick={function() { setPage(function(p) { return p-1; }); }} disabled={page===1}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                {'\u2039'}
              </button>
              {buildPages(page, totalPages).map(function(p) {
                return p === '_d1' || p === '_d2' ? (
                  <span key={p} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">{'\u2026'}</span>
                ) : (
                  <button key={p} onClick={function() { setPage(p); }}
                    className={'w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors ' +
                      (p === page ? 'text-white' : 'text-gray-500 hover:bg-gray-100')}
                    style={p === page ? { backgroundColor: '#7C3AED' } : {}}>
                    {p}
                  </button>
                );
              })}
              <button onClick={function() { setPage(function(p) { return p+1; }); }} disabled={page===totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                {'\u203A'}
              </button>
            </div>
          )}
        </div>
      )}

    </DashboardLayout>
  );
}

export default withAuth(FeedbackPage);