/**
 * pages/owner/locations.jsx
 *
 * Phase 3 (Locations and Team, spec section 7): real location management
 * replacing the Phase 2 placeholder. Owner only.
 *
 *   - Add a location (name, address, Google review URL).
 *   - Edit a location's details.
 *   - Set a location as the default (server enforces "exactly one default").
 *   - Activate / deactivate a location. No delete -- a location can carry
 *     live history (reviews, a printed QR code) the moment it exists, so
 *     "remove" here means deactivate. If the server blocks deactivating
 *     the current default, that message is shown as-is -- it already says
 *     to set a different default first.
 *
 * Every action re-fetches the location list afterward rather than
 * patching local state by hand, so the single-default invariant (only one
 * location can show the "Default" badge) is always what the server
 * actually has, not an optimistic guess.
 */
import { useEffect, useState } from 'react';
import OwnerDashboardLayout from '../../components/OwnerDashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';

function LocationFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name || '');
  const [address, setAddress] = useState(initial?.address || '');
  const [googleUrl, setGoogleUrl] = useState(initial?.google_review_url || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Location name is required.'); return; }
    if (googleUrl.trim() && !googleUrl.trim().startsWith('https://')) {
      setError('Google review URL must start with https://.');
      return;
    }

    const payload = {
      name: name.trim(),
      address: address.trim() || null,
      google_review_url: googleUrl.trim() || null,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await api.patch('/locations/' + initial._id, payload);
      } else {
        await api.post('/locations', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5" onClick={function(e) { e.stopPropagation(); }}>
        <h2 className="font-bold text-gray-900 mb-4">{isEdit ? 'Edit Location' : 'Add Location'}</h2>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="alert-error mb-4"><span>{'⚠'}</span><span>{error}</span></div>
          )}
          <div className="mb-3">
            <label className="label">Name</label>
            <input className="input" value={name} onChange={function(e) { setName(e.target.value); }} placeholder="e.g. Jalgaon Branch" />
          </div>
          <div className="mb-3">
            <label className="label">Address (optional)</label>
            <input className="input" value={address} onChange={function(e) { setAddress(e.target.value); }} placeholder="Street, area, city" />
          </div>
          <div className="mb-5">
            <label className="label">Google Review URL (optional)</label>
            <input className="input" value={googleUrl} onChange={function(e) { setGoogleUrl(e.target.value); }} placeholder="https://g.page/r/.../review" />
            <p className="text-[10px] text-gray-400 mt-1">Leave blank to use the business-wide default.</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={saving} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Location')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LocationCard({ loc, onEdit, onToggleStatus, onMakeDefault, onOpenWorkspace, busy, opening }) {
  const isActive = loc.status === 'active';
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-900 truncate">{loc.name}</p>
            {loc.is_default && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded">Default</span>
            )}
          </div>
          {loc.address && <p className="text-xs text-gray-400 mt-0.5 truncate">{loc.address}</p>}
        </div>
        <span className={'shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ' +
          (isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400')}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {loc.google_review_url && (
        <p className="text-[11px] text-gray-400 truncate">{loc.google_review_url}</p>
      )}

      <div className="flex items-center gap-4 pt-1 border-t border-gray-50">
        <button
          type="button"
          onClick={function() { onEdit(loc); }}
          className="text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          Edit
        </button>
        {isActive && (
          <button
            type="button"
            disabled={opening}
            onClick={function() { onOpenWorkspace(loc); }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
          >
            {opening ? 'Opening...' : 'Open Workspace'}
          </button>
        )}
        {!loc.is_default && (
          <button
            type="button"
            disabled={busy}
            onClick={function() { onMakeDefault(loc); }}
            className="text-xs font-semibold text-purple-600 hover:text-purple-700 disabled:opacity-50 transition-colors"
          >
            Make Default
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={function() { onToggleStatus(loc); }}
          className={'text-xs font-semibold disabled:opacity-50 transition-colors ' +
            (isActive ? 'text-red-500 hover:text-red-600' : 'text-emerald-600 hover:text-emerald-700')}
        >
          {isActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  );
}

function OwnerLocationsPage() {
  const [locations, setLocations] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalLoc, setModalLoc] = useState(undefined); // undefined = closed, null = "add", object = "edit"
  const [busyId, setBusyId] = useState(null);
  const [openingId, setOpeningId] = useState(null);
  const router = useRouter();
  const { updateUser } = useAuth();

  async function load() {
    try {
      const res = await api.get('/locations');
      setLocations(res.data.data || []);
    } catch (err) {
      setError('Could not load your locations.');
    }
  }

  useEffect(function() {
    load();
  }, []);

  function showNotice(msg) {
    setNotice(msg);
    setTimeout(function() { setNotice(''); }, 3000);
  }

  async function handleToggleStatus(loc) {
    const nextStatus = loc.status === 'active' ? 'inactive' : 'active';
    setBusyId(loc._id);
    setError('');
    try {
      await api.patch('/locations/' + loc._id, { status: nextStatus });
      await load();
      showNotice(nextStatus === 'active' ? 'Location activated.' : 'Location deactivated.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update that location.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleMakeDefault(loc) {
    setBusyId(loc._id);
    setError('');
    try {
      await api.patch('/locations/' + loc._id, { is_default: true });
      await load();
      showNotice(loc.name + ' is now the default location.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not set that as the default.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleOpenWorkspace(loc) {
    setOpeningId(loc._id);
    setError('');
    try {
      await api.patch('/locations/active', { location_id: loc._id });
      updateUser({ active_location_id: loc._id });
      // Same flag select-branch.jsx sets -- marks this as a deliberate
      // switch so withAuth's "eligible multi-location owners default to
      // /owner" rule doesn't bounce us straight back out of /dashboard.
      if (typeof window !== 'undefined') sessionStorage.setItem('rb_branch_switch', '1');
      router.push('/dashboard');
    } catch (err) {
      setOpeningId(null);
      setError(err.response?.data?.error || 'Could not open that location\'s workspace.');
    }
  }

  return (
    <OwnerDashboardLayout title="Locations" subtitle="Add, edit, and manage your branches">
      {modalLoc !== undefined && (
        <LocationFormModal
          initial={modalLoc}
          onClose={function() { setModalLoc(undefined); }}
          onSaved={function() { load(); showNotice(modalLoc ? 'Location updated.' : 'Location added.'); }}
        />
      )}

      {notice && (
        <div className="alert-success mb-4"><span>{'✓'}</span><span>{notice}</span></div>
      )}
      {error && (
        <div className="alert-error mb-4"><span>{'⚠'}</span><span>{error}</span></div>
      )}

      <div className="flex justify-end mb-4">
        <button type="button" onClick={function() { setModalLoc(null); }} className="btn-primary">
          {'+ Add Location'}
        </button>
      </div>

      {locations === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2].map(function(i) {
            return <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />;
          })}
        </div>
      ) : locations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 flex flex-col items-center text-center px-6">
          <p className="text-4xl mb-3">{'📍'}</p>
          <p className="text-sm font-semibold text-gray-700 mb-1">No locations yet</p>
          <p className="text-xs text-gray-400">Add your first location to start collecting reviews there.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {locations.map(function(loc) {
            return (
              <LocationCard
                key={loc._id}
                loc={loc}
                busy={busyId === loc._id}
                opening={openingId === loc._id}
                onEdit={function(l) { setModalLoc(l); }}
                onToggleStatus={handleToggleStatus}
                onMakeDefault={handleMakeDefault}
                onOpenWorkspace={handleOpenWorkspace}
              />
            );
          })}
        </div>
      )}
    </OwnerDashboardLayout>
  );
}

export default withAuth(OwnerLocationsPage, { requiredRole: 'owner' });
