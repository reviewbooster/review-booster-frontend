/**
 * pages/dashboard/team.jsx
 * Open to owner and branch_manager (backend scopes listStaff/createStaff/etc.
 * per role -- an owner sees and manages every branch_manager and staff
 * account in the business; a branch_manager sees and manages only the
 * staff accounts assigned to their own location(s), and can never create
 * or touch another branch_manager). Two sections on one page (previously
 * split across /dashboard/team and /dashboard/staff-performance):
 *   1. Team Accounts -- real logins (branch_manager/staff), full access
 *      control, including per-staff permissions. Collapsed by default
 *      (most single-location businesses only need Staff Directory).
 *   2. Staff Performance -- the lightweight, no-login Staff Directory,
 *      merged with its performance numbers, plus search + sort.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'react-qr-code';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// -- Staff QR Codes -------------------------------------------------------
// Each staff-directory member can have their own QR that auto-attributes
// the resulting review request to them -- no picker needed, good for a
// sticker at their own chair/station. Same design as the business QR's own
// print templates, just staff-scoped.
function drawStaffCard(ctx, W, H, businessName, staffName, qrImg) {
  ctx.clearRect(0, 0, W, H);
  var g = ctx.createLinearGradient(0, 0, W*0.4, H);
  g.addColorStop(0, '#7C3AED');
  g.addColorStop(1, '#4F46E5');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath(); ctx.arc(Math.round(W*0.85), Math.round(H*0.08), Math.round(W*0.25), 0, Math.PI*2); ctx.fill();

  var shortBiz = businessName.length > 16 ? businessName.substring(0, 16) + '...' : businessName;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold ' + Math.round(W*0.078) + 'px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(shortBiz, W/2, Math.round(H*0.11));

  ctx.fillStyle = 'rgba(255,255,255,0.68)';
  ctx.font = Math.round(W*0.042) + 'px Arial';
  ctx.fillText('Scan to share your feedback', W/2, Math.round(H*0.17));

  var pad = Math.round(W*0.09);
  var cY  = Math.round(H*0.22);
  var cH  = Math.round(H*0.54);
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, pad, cY, W-pad*2, cH, Math.round(W*0.05));
  ctx.fill();
  var qrP = Math.round((W-pad*2)*0.82);
  ctx.drawImage(qrImg, Math.round((W-qrP)/2), cY + Math.round((cH-qrP)/2), qrP, qrP);

  var shortStaff = staffName.length > 16 ? staffName.substring(0, 16) + '...' : staffName;
  ctx.fillStyle = '#FCD34D';
  ctx.font = 'bold ' + Math.round(W*0.06) + 'px Arial';
  ctx.fillText(shortStaff, W/2, Math.round(H*0.87));

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = Math.round(W*0.03) + 'px Arial';
  ctx.fillText('Powered by ReviewBooster', W/2, Math.round(H*0.95));
}

function StaffQrCard({ staffMember, baseQrUrl, businessName, onCopy, copied }) {
  const canvasRef = useRef(null);
  const svgId = 'staff-qr-svg-' + staffMember._id;

  useEffect(function() {
    var canvas = canvasRef.current;
    if (!canvas) return;
    var svgEl = document.getElementById(svgId);
    if (!svgEl) return;
    var W = 280, H = 360;
    canvas.width = W; canvas.height = H;
    var svgData = new XMLSerializer().serializeToString(svgEl);
    var blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    var burl = URL.createObjectURL(blob);
    var img  = new Image();
    img.onload = function() {
      drawStaffCard(canvas.getContext('2d'), W, H, businessName, staffMember.name, img);
      URL.revokeObjectURL(burl);
    };
    img.src = burl;
  }, [staffMember._id, businessName]);

  function handleDownload() {
    if (!canvasRef.current) return;
    var link = document.createElement('a');
    link.href     = canvasRef.current.toDataURL('image/png');
    link.download = (businessName || 'staff').replace(/\s+/g, '-').toLowerCase() + '-' + staffMember.name.replace(/\s+/g, '-').toLowerCase() + '-qr.png';
    link.click();
  }

  return (
    <div className="flex flex-col items-center gap-1.5 pt-3">
      {!baseQrUrl ? (
        <p className="text-xs text-gray-400 py-4">{'Loading QR…'}</p>
      ) : (
        <>
          <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
            <QRCode id={svgId} value={baseQrUrl + '?staff=' + staffMember._id} size={190} level="H" fgColor="#111827" bgColor="#ffffff" />
          </div>
          <div className="w-full max-w-[180px] overflow-hidden rounded-xl shadow-sm">
            <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
          <div className="flex gap-3">
            <button onClick={function() { onCopy(staffMember._id); }} className="text-[10px] font-semibold text-purple-600 hover:underline">
              {copied ? 'Copied' : 'Copy Link'}
            </button>
            <button onClick={handleDownload} className="text-[10px] font-semibold text-purple-600 hover:underline">
              Download
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Fixed permission checklist for a 'staff' account -- keep in sync with
// STAFF_PERMISSION_KEYS in business.controller.js and requirePermission.js.
var PERMISSION_OPTIONS = [
  { key: 'send_requests',    label: 'Send review requests' },
  { key: 'manage_customers', label: 'Manage customers' },
  { key: 'reply_feedback',   label: 'Reply to feedback' },
  { key: 'manage_winback',   label: 'Send win-back reminders' },
];

function AddTeamMemberModal({ onClose, onCreated, locations, isOwner, isMultiLocation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  // Only an owner at a multi-location business ever gets to pick the role --
  // a branch_manager can only ever create staff, and a single-location
  // business has no branch_manager concept at all.
  const canPickRole = isOwner && isMultiLocation;
  const [role, setRole] = useState('staff');
  const [locationIds, setLocationIds] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // A staff account needs exactly one location when the owner is assigning
  // it directly (a branch_manager creating staff needs no picker at all --
  // the backend auto-scopes to their own location).
  const needsLocationPicker = isOwner && isMultiLocation;

  function toggleLocation(id) {
    setLocationIds(function(prev) {
      if (role === 'staff') {
        // Staff belongs to exactly one location -- picking a new one
        // replaces the selection instead of adding to it.
        return prev[0] === id ? [] : [id];
      }
      return prev.includes(id) ? prev.filter(function(x) { return x !== id; }) : [...prev, id];
    });
  }

  function togglePermission(key) {
    setPermissions(function(prev) {
      return prev.includes(key) ? prev.filter(function(p) { return p !== key; }) : [...prev, key];
    });
  }

  var handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    if (!phone.trim()) { setError('Phone number is required.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (needsLocationPicker && role === 'staff' && locationIds.length === 0) {
      setError('Pick the location this staff member belongs to.');
      return;
    }

    setSaving(true);
    try {
      var payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      };
      if (canPickRole) payload.role = role;
      if (needsLocationPicker) payload.location_ids = locationIds;
      if ((canPickRole ? role : 'staff') === 'staff') payload.permissions = permissions;

      var res = await api.post('/business/staff', payload);
      onCreated(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  var effectiveRole = canPickRole ? role : 'staff';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-gray-900 mb-4">Add Team Member</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert-error mb-4"><span>{'⚠'}</span><span>{error}</span></div>}

          {canPickRole && (
            <div className="mb-3">
              <label className="label">Role</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setRole('branch_manager'); setLocationIds([]); }}
                  className={'flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ' + (role === 'branch_manager' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500')}
                >
                  Branch Manager
                </button>
                <button
                  type="button"
                  onClick={() => { setRole('staff'); setLocationIds([]); }}
                  className={'flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ' + (role === 'staff' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500')}
                >
                  Staff
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                {role === 'branch_manager'
                  ? 'Full control of the location(s) you assign below.'
                  : "Limited to the permissions you grant below, within one location."}
              </p>
            </div>
          )}

          <div className="mb-3">
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Their name" />
          </div>
          <div className="mb-3">
            <label className="label">Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="them@example.com" />
          </div>
          <div className="mb-3">
            <label className="label">Phone</label>
            <input type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="For the WhatsApp invite" />
          </div>
          <div className="mb-3">
            <label className="label">Temporary Password</label>
            <input type="text" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            <p className="text-[10px] text-gray-400 mt-1">They'll be asked to set their own password on first login.</p>
          </div>

          {needsLocationPicker && (
            <div className="mb-3">
              <label className="label">{effectiveRole === 'staff' ? 'Location' : 'Location(s)'}</label>
              <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto border border-gray-100 rounded-xl p-2">
                {locations.length === 0 ? (
                  <p className="text-xs text-gray-400 px-1 py-1">No locations yet.</p>
                ) : locations.map(function(loc) {
                  var checked = locationIds.includes(loc._id);
                  return (
                    <label key={loc._id} className="flex items-center gap-2 px-1 py-1 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={checked} onChange={() => toggleLocation(loc._id)} />
                      {loc.name}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {effectiveRole === 'staff' && (
            <div className="mb-5">
              <label className="label">Permissions</label>
              <div className="flex flex-col gap-1.5 border border-gray-100 rounded-xl p-2">
                {PERMISSION_OPTIONS.map(function(opt) {
                  var checked = permissions.includes(opt.key);
                  return (
                    <label key={opt.key} className="flex items-center gap-2 px-1 py-1 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={checked} onChange={() => togglePermission(opt.key)} />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Viewing customers, reviews, and feedback is always included.</p>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={saving} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PermissionEditor({ member, onSaved }) {
  const [permissions, setPermissions] = useState(member.permissions || []);
  const [saving, setSaving] = useState(false);

  async function togglePermission(key) {
    var next = permissions.includes(key) ? permissions.filter(function(p) { return p !== key; }) : [...permissions, key];
    setPermissions(next);
    setSaving(true);
    try {
      await api.patch('/business/staff/' + member._id + '/permissions', { permissions: next });
      onSaved(member._id, next);
    } catch (e) {
      setPermissions(permissions); // revert on failure
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {PERMISSION_OPTIONS.map(function(opt) {
        var checked = permissions.includes(opt.key);
        return (
          <button
            key={opt.key}
            type="button"
            disabled={saving}
            onClick={() => togglePermission(opt.key)}
            className={'text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors disabled:opacity-50 ' + (checked ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-400')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

var SORT_OPTIONS = [
  { key: 'name_asc',      label: 'Name (A–Z)' },
  { key: 'most_handled',  label: 'Most customers handled' },
  { key: 'highest_positive', label: 'Highest positive %' },
];

function TeamPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [toast, setToast] = useState('');
  const [showTeamAccounts, setShowTeamAccounts] = useState(false);
  const [locations, setLocations] = useState([]);

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
  const [qrData,           setQrData]            = useState(null);
  const [expandedQrId,     setExpandedQrId]      = useState(null);
  const [copiedQrId,       setCopiedQrId]        = useState(null);

  useEffect(function() {
    api.get('/business/my-qr').then(function(res) {
      setQrData(res.data && res.data.data ? res.data.data : null);
    }).catch(function() {});
  }, []);

  useEffect(function() {
    api.get('/locations').then(function(res) {
      setLocations(res.data && res.data.data ? res.data.data : []);
    }).catch(function() {});
  }, []);

  var isMultiLocation = locations.length > 1;

  var baseQrUrl = (qrData && typeof window !== 'undefined')
    ? window.location.origin + '/qr/' + qrData.qr_token
    : '';

  function toggleQr(staffId) {
    setExpandedQrId(function(prev) { return prev === staffId ? null : staffId; });
  }

  function handleCopyQr(staffId) {
    navigator.clipboard.writeText(baseQrUrl + '?staff=' + staffId).then(function() {
      setCopiedQrId(staffId);
      setTimeout(function() { setCopiedQrId(null); }, 2000);
    }).catch(function() {});
  }

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
      // silent -- this section is optional, don't block the page over it
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
      setError('Failed to load team accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  var handleCreated = (newMember) => {
    setStaff((prev) => [newMember, ...prev]);
    setToast((newMember.role === 'branch_manager' ? 'Branch manager' : 'Staff') + ' account created.');
    setTimeout(() => setToast(''), 3000);
    setShowTeamAccounts(true);
  };

  var handleRemove = async (id) => {
    if (!window.confirm('Remove this team member? They will no longer be able to log in.')) return;
    setRemovingId(id);
    try {
      await api.delete('/business/staff/' + id);
      setStaff((prev) => prev.filter((s) => s._id !== id));
    } catch (e) {
      setError('Failed to remove this account.');
    } finally {
      setRemovingId(null);
    }
  };

  function handlePermissionsSaved(id, nextPermissions) {
    setStaff((prev) => prev.map((s) => (s._id === id ? { ...s, permissions: nextPermissions } : s)));
  }

  function locationNames(locationIds) {
    if (!locationIds || locationIds.length === 0) return null;
    var byId = {};
    locations.forEach(function(l) { byId[l._id] = l.name; });
    return locationIds.map(function(id) { return byId[id] || byId[id && id._id] || null; }).filter(Boolean).join(', ');
  }

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
      {showAdd && (
        <AddTeamMemberModal
          onClose={() => setShowAdd(false)}
          onCreated={handleCreated}
          locations={locations}
          isOwner={isOwner}
          isMultiLocation={isMultiLocation}
        />
      )}

      {toast && (
        <div className="alert-success mb-4"><span>{'✓'}</span><span>{toast}</span></div>
      )}

      {/* -- Section 1: Team Accounts (real logins) -- collapsed by default --- */}
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
            {isOwner
              ? 'Branch managers have full control of their assigned location(s). Staff get only the permissions you grant them.'
              : "Staff you add here are scoped to your own location, with only the permissions you grant them."}
          </p>

          <div className="flex justify-end mb-3">
            <button onClick={() => setShowAdd(true)} className="btn-primary">
              {'+ Add Team Member'}
            </button>
          </div>

          {error && (
            <div className="alert-error mb-4"><span>{'⚠'}</span><span>{error}</span></div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-10">
            {loading ? (
              <div className="p-6">
                <p className="text-gray-400 text-sm">Loading team...</p>
              </div>
            ) : staff.length === 0 ? (
              <div className="py-16 flex flex-col items-center text-center px-6">
                <p className="text-4xl mb-3">{'👥'}</p>
                <p className="text-sm font-semibold text-gray-700 mb-1">No team accounts yet</p>
                <p className="text-xs text-gray-400">Add a branch manager or staff account to give them their own login.</p>
              </div>
            ) : (
              staff.map((s) => (
                <div key={s._id} className="flex items-start justify-between px-5 py-4 border-b border-gray-100 last:border-0 gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-sm shrink-0">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                        <span className={'text-[10px] font-semibold px-2 py-0.5 rounded-full ' + (s.role === 'branch_manager' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500')}>
                          {s.role === 'branch_manager' ? 'Branch Manager' : 'Staff'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{s.email}</p>
                      {locationNames(s.location_ids) && (
                        <p className="text-[11px] text-gray-400 mt-0.5">{locationNames(s.location_ids)}</p>
                      )}
                      {s.role === 'staff' && <PermissionEditor member={s} onSaved={handlePermissionsSaved} />}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
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
        {'Optional — track who’s serving customers, no login needed.'}
      </p>

      {directoryError && (
        <div className="alert-error mb-3"><span>{'⚠'}</span><span>{directoryError}</span></div>
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
            <p className="text-3xl mb-2">{'📛'}</p>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              {directory.length === 0 ? 'No one in the directory yet' : 'No matches'}
            </p>
            <p className="text-xs text-gray-400">
              {directory.length === 0 ? "Add a name above if you'd like to track who's serving customers." : 'Try a different search.'}
            </p>
          </div>
        ) : (
          visibleDirectory.map(function(s) {
            var isQrOpen = expandedQrId === s._id;
            return (
              <div key={s._id} className="border-b border-gray-100 last:border-0">
                <div className="flex items-center justify-between px-5 py-3.5 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-xs shrink-0">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                      {s.has_data ? (
                        <p className="text-[11px] text-gray-400">
                          {s.customers_handled + ' handled · '}
                          <span className="text-green-600 font-semibold">{s.positive_pct + '% positive'}</span>
                          {' · ' + s.reviews_generated + ' reviews'}
                        </p>
                      ) : (
                        <p className="text-[11px] text-gray-400">
                          {s.customers_handled + ' handled · not enough data yet'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={function() { toggleQr(s._id); }}
                      className={'text-xs font-semibold transition-colors ' + (isQrOpen ? 'text-purple-600' : 'text-gray-400 hover:text-purple-600')}>
                      QR
                    </button>
                    <button
                      onClick={function() { handleRemoveDirEntry(s._id); }}
                      disabled={removingDirId === s._id}
                      className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors">
                      {removingDirId === s._id ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
                {isQrOpen && (
                  <div className="px-5 pb-4 flex justify-center">
                    <StaffQrCard
                      staffMember={s}
                      baseQrUrl={baseQrUrl}
                      businessName={qrData && qrData.business_name}
                      onCopy={handleCopyQr}
                      copied={copiedQrId === s._id}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}

export default withAuth(TeamPage);
