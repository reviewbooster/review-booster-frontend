/**
 * pages/owner/team.jsx
 *
 * Phase 3 (Locations and Team, spec section 8): branch manager accounts
 * and their location assignments, replacing the Phase 2 placeholder.
 * Owner only.
 *
 * This page is ONLY about real login accounts (role: 'branch_manager'),
 * via /api/business/staff -- it is a different system from the no-login
 * Staff Directory ("who served this customer", /api/staff-directory),
 * which stays where it already lives on the branch dashboard's Team page
 * and is intentionally not touched here.
 *
 * A branch manager's location_ids are shown as name chips (cross-referenced
 * against GET /api/locations, since /business/staff only returns ids) and
 * can be changed via a location multi-select, which PATCHes the complete
 * desired set to /business/staff/:id/locations -- not an add/remove diff.
 *
 * WhatsApp invite (added): AddStaffModal optionally collects a phone
 * number. After the account is created, instead of closing right away it
 * shows a one-tap "Send via WhatsApp" step with a single ready-to-send
 * message -- greeting, login link, username (email), and temporary
 * password -- built and opened the same way reviews.jsx already does for
 * review requests: a wa.me link, navigated to with window.location.href
 * (not window.open) for reliable mobile WhatsApp handoff without popup
 * blocking.
 */
import { useEffect, useMemo, useState } from 'react';
import OwnerDashboardLayout from '../../components/OwnerDashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';

const LOGIN_URL = 'https://review-booster-frontend-rust.vercel.app/login';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Accepts a loosely-typed Indian mobile number (with or without +91, with
// spaces/dashes, with a leading 0) and normalizes it to bare E.164 digits
// (no leading +) for the wa.me link. Returns null if it doesn't look like
// a usable number at all.
function normalizePhoneForWhatsapp(raw) {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, '');
  digits = digits.replace(/^\+/, '');
  digits = digits.replace(/^0+/, '');
  if (digits.length === 10) digits = '91' + digits;
  if (!/^\d{11,15}$/.test(digits)) return null;
  return digits;
}

function buildInviteMessage(name, email, password) {
  return (
    'Hi ' + name + ',\n\n' +
    'You\'ve been added as a Branch Manager on ReviewBooster.\n\n' +
    'Login link: ' + LOGIN_URL + '\n' +
    'Username: ' + email + '\n' +
    'Temporary password: ' + password + '\n\n' +
    'Please log in and change your password on first login.'
  );
}

function LocationCheckboxList({ locations, selectedIds, onChange }) {
  function toggle(id) {
    const idStr = String(id);
    const next = selectedIds.some(function(x) { return String(x) === idStr; })
      ? selectedIds.filter(function(x) { return String(x) !== idStr; })
      : selectedIds.concat([id]);
    onChange(next);
  }

  if (locations.length === 0) {
    return <p className="text-xs text-gray-400">No locations exist yet -- add one on the Locations page first.</p>;
  }

  return (
    <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-48 overflow-y-auto">
      {locations.map(function(loc) {
        const checked = selectedIds.some(function(x) { return String(x) === String(loc._id); });
        return (
          <label key={loc._id} className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={checked}
              onChange={function() { toggle(loc._id); }}
              className="w-4 h-4 accent-purple-600"
            />
            <span className="text-sm text-gray-800">{loc.name}</span>
            {loc.status !== 'active' && (
              <span className="text-[10px] text-gray-400">(inactive)</span>
            )}
          </label>
        );
      })}
    </div>
  );
}

function AddStaffModal({ locations, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [locationIds, setLocationIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Once the account is created, if a phone number was given we switch to
  // this step instead of closing -- holds exactly what's needed to build
  // the WhatsApp message (never re-fetched from the server afterwards,
  // since the plaintext password only ever exists here, in this form).
  const [created, setCreated] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    const trimmedPhone = phone.trim();
    if (trimmedPhone && !normalizePhoneForWhatsapp(trimmedPhone)) {
      setError('That phone number doesn\'t look right. Use a 10-digit mobile number.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/business/staff', {
        name: name.trim(),
        email: email.trim(),
        password,
        location_ids: locationIds,
        phone: trimmedPhone || undefined,
      });
      onCreated(res.data.data);
      if (trimmedPhone) {
        setCreated({ name: name.trim(), email: email.trim(), password, phone: trimmedPhone });
      } else {
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleSendWhatsapp() {
    const digits = normalizePhoneForWhatsapp(created.phone);
    if (!digits) return;
    const msg = buildInviteMessage(created.name, created.email, created.password);
    const waUrl = 'https://wa.me/' + digits + '?text=' + encodeURIComponent(msg);
    // Navigating the current tab (not a new window) is what reliably hands
    // off to WhatsApp on mobile and sidesteps popup blocking -- same
    // pattern used for review requests in pages/dashboard/reviews.jsx.
    window.location.href = waUrl;
  }

  if (created) {
    const message = buildInviteMessage(created.name, created.email, created.password);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 max-h-[90vh] overflow-y-auto" onClick={function(e) { e.stopPropagation(); }}>
          <h2 className="font-bold text-gray-900 mb-1">{'Manager added ✓'}</h2>
          <p className="text-xs text-gray-400 mb-4">Send their login details to {created.phone} on WhatsApp.</p>
          <div className="mb-5 p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-600 whitespace-pre-wrap">
            {message}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Skip
            </button>
            <button type="button" onClick={handleSendWhatsapp} className="btn-primary flex-1 justify-center">
              {'Send via WhatsApp'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 max-h-[90vh] overflow-y-auto" onClick={function(e) { e.stopPropagation(); }}>
        <h2 className="font-bold text-gray-900 mb-4">Add Branch Manager</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert-error mb-4"><span>{'⚠'}</span><span>{error}</span></div>}
          <div className="mb-3">
            <label className="label">Name</label>
            <input className="input" value={name} onChange={function(e) { setName(e.target.value); }} placeholder="Staff member's name" />
          </div>
          <div className="mb-3">
            <label className="label">Email</label>
            <input type="email" className="input" value={email} onChange={function(e) { setEmail(e.target.value); }} placeholder="them@example.com" />
          </div>
          <div className="mb-3">
            <label className="label">Phone (optional)</label>
            <input type="tel" className="input" value={phone} onChange={function(e) { setPhone(e.target.value); }} placeholder="10-digit mobile number" />
            <p className="text-[10px] text-gray-400 mt-1">Add this to send their login details over WhatsApp.</p>
          </div>
          <div className="mb-3">
            <label className="label">Temporary Password</label>
            <input type="text" className="input" value={password} onChange={function(e) { setPassword(e.target.value); }} placeholder="At least 8 characters" />
          </div>
          <div className="mb-5">
            <label className="label">Locations</label>
            <p className="text-[10px] text-gray-400 mb-1.5">Which branches can they access?</p>
            <LocationCheckboxList locations={locations} selectedIds={locationIds} onChange={setLocationIds} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={saving} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Adding...' : 'Add Manager'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditLocationsModal({ staffMember, locations, onClose, onSaved }) {
  const [locationIds, setLocationIds] = useState((staffMember.location_ids || []).map(String));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const res = await api.patch('/business/staff/' + staffMember._id + '/locations', { location_ids: locationIds });
      onSaved(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update locations. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5" onClick={function(e) { e.stopPropagation(); }}>
        <h2 className="font-bold text-gray-900 mb-1">Edit Locations</h2>
        <p className="text-xs text-gray-400 mb-4">{staffMember.name}</p>
        {error && <div className="alert-error mb-4"><span>{'⚠'}</span><span>{error}</span></div>}
        <div className="mb-5">
          <LocationCheckboxList locations={locations} selectedIds={locationIds} onChange={setLocationIds} />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OwnerTeamPage() {
  const [staff, setStaff] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [staffRes, locRes] = await Promise.all([
        api.get('/business/staff'),
        api.get('/locations'),
      ]);
      setStaff(staffRes.data.data || []);
      setLocations(locRes.data.data || []);
    } catch (err) {
      setError('Could not load your team.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(function() { load(); }, []);

  const locationsById = useMemo(function() {
    const map = {};
    locations.forEach(function(l) { map[String(l._id)] = l; });
    return map;
  }, [locations]);

  function showNotice(msg) {
    setNotice(msg);
    setTimeout(function() { setNotice(''); }, 3000);
  }

  function handleCreated(newStaff) {
    setStaff(function(prev) { return [newStaff, ...prev]; });
    showNotice('Branch manager added.');
  }

  function handleLocationsSaved(updated) {
    setStaff(function(prev) {
      return prev.map(function(s) {
        return s._id === updated._id ? Object.assign({}, s, updated) : s;
      });
    });
    showNotice('Locations updated.');
  }

  async function handleRemove(id) {
    if (!window.confirm('Remove this branch manager? They will no longer be able to log in.')) return;
    setRemovingId(id);
    try {
      await api.delete('/business/staff/' + id);
      setStaff(function(prev) { return prev.filter(function(s) { return s._id !== id; }); });
    } catch (err) {
      setError('Could not remove that account.');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <OwnerDashboardLayout title="Team & Permissions" subtitle="Branch managers and their location access">
      {showAdd && (
        <AddStaffModal
          locations={locations}
          onClose={function() { setShowAdd(false); }}
          onCreated={handleCreated}
        />
      )}
      {editingStaff && (
        <EditLocationsModal
          staffMember={editingStaff}
          locations={locations}
          onClose={function() { setEditingStaff(null); }}
          onSaved={handleLocationsSaved}
        />
      )}

      {notice && <div className="alert-success mb-4"><span>{'✓'}</span><span>{notice}</span></div>}
      {error && <div className="alert-error mb-4"><span>{'⚠'}</span><span>{error}</span></div>}

      <p className="text-xs text-gray-400 mb-3">
        {'Branch managers can only see and act on the locations assigned to them — never the whole business by default.'}
      </p>

      <div className="flex justify-end mb-3">
        <button type="button" onClick={function() { setShowAdd(true); }} className="btn-primary">
          {'+ Add Branch Manager'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6"><p className="text-gray-400 text-sm">Loading team...</p></div>
        ) : staff.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center px-6">
            <p className="text-4xl mb-3">{'👥'}</p>
            <p className="text-sm font-semibold text-gray-700 mb-1">No branch managers yet</p>
            <p className="text-xs text-gray-400">Add one and assign them to a location to get started.</p>
          </div>
        ) : (
          staff.map(function(s) {
            const assigned = (s.location_ids || []).map(function(id) { return locationsById[String(id)]; }).filter(Boolean);
            return (
              <div key={s._id} className="flex items-center justify-between px-5 py-4 border-b border-gray-100 last:border-0 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-sm shrink-0">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                    <p className="text-xs text-gray-400 truncate">{s.email}</p>
                    <div className="flex items-center gap-1 flex-wrap mt-1">
                      {assigned.length === 0 ? (
                        <span className="text-[10px] text-amber-600 font-semibold">No locations assigned</span>
                      ) : (
                        assigned.map(function(loc) {
                          return (
                            <span key={loc._id} className="text-[10px] font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                              {loc.name}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-xs text-gray-400 hidden sm:block">{'Added ' + fmtDate(s.created_at)}</p>
                  <button
                    type="button"
                    onClick={function() { setEditingStaff(s); }}
                    className="text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Edit Locations
                  </button>
                  <button
                    type="button"
                    onClick={function() { handleRemove(s._id); }}
                    disabled={removingId === s._id}
                    className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors"
                  >
                    {removingId === s._id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </OwnerDashboardLayout>
  );
}

export default withAuth(OwnerTeamPage, { requiredRole: 'owner' });
