/**
 * pages/dashboard/team.jsx
 * Owner-only. Two sections on one page (previously split across
 * /dashboard/team and /dashboard/staff-performance):
 *   1. Team Accounts — real logins (owner/staff), full access control.
 *      Collapsed by default (most businesses only need Staff Directory).
 *   2. Staff Performance — the lightweight, no-login Staff Directory,
 *      merged with its performance numbers, plus search + sort.
 */

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';

function fmtDate(d) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function AddStaffAccountModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  var handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setSaving(true);
    try {
      var res = await api.post('/business/staff', { name: name.trim(), email: email.trim(), password });
      onCreated(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-gray-900 mb-4">Add Staff Account</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert-error mb-4"><span>{'\u26A0'}</span><span>{error}</span></div>}
          <div className="mb-3">
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Staff member's name" />
          </div>
          <div className="mb-3">
            <label className="label">Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="them@example.com" />
          </div>
          <div className="mb-5">
            <label className="label">Temporary Password</label>
            <input type="text" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            <p className="text-[10px] text-gray-400 mt-1">They'll be asked to set their own password on first login.</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={saving} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Adding...' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

var SORT_OPTIONS = [
  { key: 'name_asc',      label: 'Name (A\u2013Z)' },
  { key: 'most_handled',  label: 'Most customers handled' },
  { key: 'highest_positive', label: 'Highest positive %' },
];

function TeamPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [toast, setToast] = useState('');
  const [showTeamAccounts, setShowTeamAccounts] = useState(false);

  // -- Staff Performance (Staff Directory + its stats, merged) -------------
  const [directory,        setDirectory]        = useState([]);
  const [statsByName,      setStatsByName]      = useState({});
  const [directoryLoading, setDirectoryLoading]  = useState(true);
  const [newDirName,       setNewDirName]        = useState('');
  const [addingDirEntry,   setAddingDirEntry]    = useState(false);
  const [removingDirId,    setRemovingDirId]     = useState(null);
  const [directoryError,   setDirectoryError]    = useState('');
  const [search,           setSearch]            = useState('');
  const [sortKey,          setSortKey]           = useState('name_asc');

  const loadDirectory = async () => {
    setDirectoryLoading(true);
    try {
      var results = await Promise.all([
        api.get('/staff-directory'),
        api.get('/staff-directory/stats'),
      ]);
      setDirectory(results[0].data.data ?? []);
      var map = {};
      (results[1].data.data ?? []).forEach(function(s) { map[s.name] = s; });
      setStatsByName(map);
    } catch (e) {
      // silent — this section is optional, don't block the page over it
    } finally {
      setDirectoryLoading(false);
    }
  };

  var handleAddDirEntry = async function(e) {
    e.preventDefault();
    setDirectoryError('');
    if (!newDirName.trim()) return;
    setAddingDirEntry(true);
    try {
      var res = await api.post('/staff-directory', { name: newDirName.trim() });
      setDirectory(function(prev) { return [...prev, res.data.data].sort(function(a, b) { return a.name.localeCompare(b.name); }); });
      setNewDirName('');
    } catch (err) {
      setDirectoryError(err.response?.data?.error || 'Failed to add.');
    } finally {
      setAddingDirEntry(false);
    }
  };

  var handleRemoveDirEntry = async function(id) {
    setRemovingDirId(id);
    try {
      await api.delete('/staff-directory/' + id);
      setDirectory(function(prev) { return prev.filter(function(s) { return s._id !== id; }); });
    } catch (e) {
      setDirectoryError('Failed to remove.');
    } finally {
      setRemovingDirId(null);
    }
  };

  useEffect(function() { loadDirectory(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      var res = await api.get('/business/staff');
      setStaff(res.data.data ?? []);
    } catch (e) {
      setError('Failed to load staff accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  var handleCreated = (newStaff) => {
    setStaff((prev) => [newStaff, ...prev]);
    setToast('Staff account created.');
    setTimeout(() => setToast(''), 3000);
    setShowTeamAccounts(true);
  };

  var handleRemove = async (id) => {
    if (!window.confirm('Remove this staff member? They will no longer be able to log in.')) return;
    setRemovingId(id);
    try {
      await api.delete('/business/staff/' + id);
      setStaff((prev) => prev.filter((s) => s._id !== id));
    } catch (e) {
      setError('Failed to remove staff account.');
    } finally {
      setRemovingId(null);
    }
  };

  var visibleDirectory = useMemo(function() {
    var list = directory.map(function(d) {
      var s = statsByName[d.name];
      return {
        _id: d._id,
        name: d.name,
        customers_handled: s ? s.customers_handled : 0,
        positive_pct: s ? s.positive_pct : 0,
        negative_pct: s ? s.negative_pct : 0,
        reviews_generated: s ? s.reviews_generated : 0,
        has_data: !!s && s.customers_handled >= 3,
      };
    });
    if (search.trim()) {
      var q = search.trim().toLowerCase();
      list = list.filter(function(d) { return d.name.toLowerCase().includes(q); });
    }
    list.sort(function(a, b) {
      if (sortKey === 'most_handled') return b.customers_handled - a.customers_handled;
      if (sortKey === 'highest_positive') return b.positive_pct - a.positive_pct;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [directory, statsByName, search, sortKey]);

  return (
    <DashboardLayout>
      {showAdd && <AddStaffAccountModal onClose={() => setShowAdd(false)} onCreated={handleCreated} />}

      {toast && (
        <div className="alert-success mb-4"><span>{'\u2713'}</span><span>{toast}</span></div>
      )}

      {/* -- Section 1: Team Accounts (real logins) — collapsed by default --- */}
      <button
        onClick={() => setShowTeamAccounts(function(v) { return !v; })}
        className="w-full flex items-center justify-between py-2 mb-1"
      >
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">Team Accounts</h1>
          <span className="text-xs text-gray-400 font-semibold">{'(' + staff.length + ')'}</span>
        </div>
        <svg
          width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
          className={'text-gray-400 transition-transform ' + (showTeamAccounts ? 'rotate-180' : '')}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {showTeamAccounts && (
        <>
          <p className="text-xs text-gray-400 mb-3">
            {'Staff can view Feedback, Reviews, Customers & QR Code \u2014 but not Settings, billing, or other staff.'}
          </p>

          <div className="flex justify-end mb-3">
            <button onClick={() => setShowAdd(true)} className="btn-primary">
              {'+ Add Staff Account'}
            </button>
          </div>

          {error && (
            <div className="alert-error mb-4"><span>{'\u26A0'}</span><span>{error}</span></div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-10">
            {loading ? (
              <div className="p-6">
                <p className="text-gray-400 text-sm">Loading team...</p>
              </div>
            ) : staff.length === 0 ? (
              <div className="py-16 flex flex-col items-center text-center px-6">
                <p className="text-4xl mb-3">{'\uD83D\uDC65'}</p>
                <p className="text-sm font-semibold text-gray-700 mb-1">No staff accounts yet</p>
                <p className="text-xs text-gray-400">Add your first staff account to give them view access to Feedback, Reviews, and Customers.</p>
              </div>
            ) : (
              staff.map((s) => (
                <div key={s._id} className="flex items-center justify-between px-5 py-4 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-sm shrink-0">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-gray-400 hidden sm:block">{'Added ' + fmtDate(s.created_at)}</p>
                    <button
                      onClick={() => handleRemove(s._id)}
                      disabled={removingId === s._id}
                      className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors">
                      {removingId === s._id ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <div className={showTeamAccounts ? '' : 'mb-6'} />

      {/* -- Section 2: Staff Performance (Staff Directory + stats, merged) --- */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold text-gray-900">Staff Performance</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        {'Optional \u2014 track who\u2019s serving customers, no login needed.'}
      </p>

      {directoryError && (
        <div className="alert-error mb-3"><span>{'\u26A0'}</span><span>{directoryError}</span></div>
      )}

      <form onSubmit={handleAddDirEntry} className="flex gap-2 mb-4">
        <input
          className="input flex-1"
          placeholder="e.g. Priya"
          value={newDirName}
          onChange={function(e) { setNewDirName(e.target.value); }}
        />
        <button type="submit" disabled={addingDirEntry || !newDirName.trim()} className="btn-primary shrink-0">
          {addingDirEntry ? 'Adding...' : '+ Add Staff'}
        </button>
      </form>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
          </span>
          <input
            className="w-full bg-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-200 transition"
            placeholder="Search by name..."
            value={search}
            onChange={function(e) { setSearch(e.target.value); }}
          />
        </div>
        <select
          value={sortKey}
          onChange={function(e) { setSortKey(e.target.value); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600 font-medium outline-none focus:ring-2 focus:ring-purple-200 cursor-pointer shrink-0"
        >
          {SORT_OPTIONS.map(function(opt) {
            return <option key={opt.key} value={opt.key}>{opt.label}</option>;
          })}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-2">
        {directoryLoading ? (
          <div className="p-6"><p className="text-gray-400 text-sm">Loading...</p></div>
        ) : visibleDirectory.length === 0 ? (
          <div className="py-10 flex flex-col items-center text-center px-6">
            <p className="text-3xl mb-2">{'\uD83D\uDCDB'}</p>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              {directory.length === 0 ? 'No one in the directory yet' : 'No matches'}
            </p>
            <p className="text-xs text-gray-400">
              {directory.length === 0 ? "Add a name above if you'd like to track who's serving customers." : 'Try a different search.'}
            </p>
          </div>
        ) : (
          visibleDirectory.map(function(s) {
            return (
              <div key={s._id} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 last:border-0 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-xs shrink-0">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                    {s.has_data ? (
                      <p className="text-[11px] text-gray-400">
                        {s.customers_handled + ' handled \u00b7 '}
                        <span className="text-green-600 font-semibold">{s.positive_pct + '% positive'}</span>
                        {' \u00b7 ' + s.reviews_generated + ' reviews'}
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-400">
                        {s.customers_handled + ' handled \u00b7 not enough data yet'}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={function() { handleRemoveDirEntry(s._id); }}
                  disabled={removingDirId === s._id}
                  className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors">
                  {removingDirId === s._id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}

export default withAuth(TeamPage, { requiredRole: 'owner' });