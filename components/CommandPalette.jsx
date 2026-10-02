/**
 * components/CommandPalette.jsx
 * Ctrl/Cmd+K global search for Super Admin -- businesses, owners, support
 * chats, and audit log entries. Mounted once in Sidebar.jsx, gated to
 * super_admin only. Note: audit log search only reflects actions that are
 * actually logged today (billing + referral actions) -- not a full history
 * of every admin action yet.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import Router from 'next/router';
import api from '../lib/api';

function fmtRelative(d) {
  if (!d) return '';
  var ms = Date.now() - new Date(d).getTime();
  var mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  var hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.floor(hrs / 24) + 'd ago';
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const close = useCallback(function() {
    setOpen(false);
    setQ('');
    setResults(null);
  }, []);

  function go(href) {
    close();
    Router.push(href);
  }

  useEffect(function() {
    function onKeyDown(e) {
      var isK = e.key === 'k' || e.key === 'K';
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault();
        setOpen(function(o) { return !o; });
      } else if (e.key === 'Escape') {
        close();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return function() { window.removeEventListener('keydown', onKeyDown); };
  }, [close]);

  useEffect(function() {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(function() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setResults(null); return; }
    setLoading(true);
    debounceRef.current = setTimeout(function() {
      api.get('/admin/global-search?q=' + encodeURIComponent(q.trim()))
        .then(function(res) { setResults(res.data.data); })
        .catch(function() { setResults(null); })
        .finally(function() { setLoading(false); });
    }, 250);
    return function() { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  if (!open) return null;

  var hasAny = results && (
    results.businesses.length || results.owners.length ||
    results.support_chats.length || results.audit_log.length
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4 bg-black/40 backdrop-blur-sm" onClick={close}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={function(e) { e.stopPropagation(); }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <span className="text-gray-400">{'\uD83D\uDD0D'}</span>
          <input
            ref={inputRef}
            value={q}
            onChange={function(e) { setQ(e.target.value); }}
            placeholder="Search businesses, owners, chats, audit log..."
            className="flex-1 text-sm outline-none"
          />
          <kbd className="text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {q.trim().length < 2 ? (
            <p className="text-xs text-gray-400 px-4 py-6 text-center">Type at least 2 characters to search.</p>
          ) : loading ? (
            <p className="text-xs text-gray-400 px-4 py-6 text-center">Searching...</p>
          ) : !hasAny ? (
            <p className="text-xs text-gray-400 px-4 py-6 text-center">No matches.</p>
          ) : (
            <>
              {results.businesses.length > 0 && (
                <div className="py-2">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-4 mb-1">Businesses</p>
                  {results.businesses.map(function(b) {
                    return (
                      <button key={b.business_id} onClick={function() { go('/dashboard/admin/businesses/' + b.business_id); }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-800">{b.name}</span>
                        <span className="text-[11px] text-gray-400 capitalize">{b.plan}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {results.owners.length > 0 && (
                <div className="py-2 border-t border-gray-50">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-4 mb-1">Owners</p>
                  {results.owners.map(function(o) {
                    return (
                      <button key={o.user_id}
                        onClick={function() { if (o.business_id) go('/dashboard/admin/businesses/' + o.business_id); }}
                        disabled={!o.business_id}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between gap-2 disabled:opacity-50">
                        <div>
                          <span className="text-sm text-gray-800">{o.name}</span>
                          <span className="text-[11px] text-gray-400 ml-2">{o.email}</span>
                        </div>
                        {o.business_name && <span className="text-[11px] text-gray-400">{o.business_name}</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {results.support_chats.length > 0 && (
                <div className="py-2 border-t border-gray-50">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-4 mb-1">Support Chats</p>
                  {results.support_chats.map(function(c) {
                    return (
                      <button key={c.chat_id} onClick={function() { go('/dashboard/admin/support-chats'); }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-800">{c.guest_name}</span>
                        <span className="text-[11px] text-gray-400">{fmtRelative(c.last_message_at)}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {results.audit_log.length > 0 && (
                <div className="py-2 border-t border-gray-50">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-4 mb-1">Audit Log</p>
                  {results.audit_log.map(function(l) {
                    return (
                      <button key={l.log_id} onClick={function() { go('/dashboard/admin/audit-log'); }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-sm text-gray-800">{l.action}</span>
                          {l.target_label && <span className="text-[11px] text-gray-400 ml-2">{l.target_label}</span>}
                        </div>
                        <span className="text-[11px] text-gray-400">{fmtRelative(l.created_at)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}