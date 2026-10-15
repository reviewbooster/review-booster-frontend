/**
 * pages/dashboard/select-branch.jsx
 *
 * Phase 2 -- the mandatory branch selector (spec section 3, called out as
 * a "Mandatory branch selection" non-negotiable behavior):
 *   "Every switch from Owner Dashboard back to normal Review Booster must
 *    display a branch selector. Never silently open the last-used branch
 *    or a default branch."
 *
 * This page is the ONLY way "Switch to Branch Dashboard" reaches
 * /dashboard -- OwnerSidebar always routes here first, never straight to
 * /dashboard. Picking a location calls PATCH /api/locations/active (which
 * re-verifies the user is actually authorized for that location
 * server-side, not just that the UI happened to show it), updates the
 * user's active_location_id in AuthContext, and only then opens
 * /dashboard.
 *
 * Reachable by any authenticated user (not owner-gated): a branch manager
 * with more than one assigned location could use this too, once that's
 * exposed, without needing a second page built later.
 */
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

function SelectBranchPage() {
  const router = useRouter();
  const { updateUser } = useAuth();
  const [locations, setLocations] = useState(null);
  const [error,      setError]    = useState('');
  const [query,      setQuery]    = useState('');
  const [switching,  setSwitching] = useState(null); // location _id being switched to

  useEffect(function() {
    let cancelled = false;
    api.get('/locations')
      .then(function(res) {
        if (!cancelled) setLocations(res.data.data || []);
      })
      .catch(function() {
        if (!cancelled) setError('Could not load your locations. Please try again.');
      });
    return function() { cancelled = true; };
  }, []);

  const filtered = useMemo(function() {
    if (!locations) return [];
    const q = query.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter(function(loc) {
      return (loc.name || '').toLowerCase().indexOf(q) !== -1 ||
             (loc.address || '').toLowerCase().indexOf(q) !== -1;
    });
  }, [locations, query]);

  function handleSelect(loc) {
    setSwitching(loc._id);
    setError('');
    api.patch('/locations/active', { location_id: loc._id })
      .then(function() {
        updateUser({ active_location_id: loc._id });
        // Marks this as a deliberate switch so withAuth's "eligible
        // multi-location owners default to /owner" rule doesn't bounce us
        // straight back out before the branch dashboard ever loads --
        // that rule is only meant for a bookmark/back-button landing on a
        // bare /dashboard, not for the one legitimate reason to BE there.
        if (typeof window !== 'undefined') sessionStorage.setItem('rb_branch_switch', '1');
        router.replace('/dashboard');
      })
      .catch(function(err) {
        setSwitching(null);
        setError(err.response?.data?.error || 'Could not switch to that branch. Please try again.');
      });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900">Select a branch</h1>
          <p className="text-sm text-gray-400 mt-1">Choose which location you'd like to work in.</p>
        </div>

        {locations && locations.length > 5 && (
          <input
            type="text"
            value={query}
            onChange={function(e) { setQuery(e.target.value); }}
            placeholder="Search locations…"
            className="w-full mb-3 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-purple-200"
          />
        )}

        {error && (
          <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs">
            {error}
          </div>
        )}

        {locations === null ? (
          <div className="space-y-2">
            {[1, 2, 3].map(function(i) {
              return <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />;
            })}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-sm text-gray-400">
            {locations.length === 0 ? 'No locations are available to you yet.' : 'No locations match your search.'}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
            {filtered.map(function(loc) {
              const isSwitching = switching === loc._id;
              return (
                <button
                  key={loc._id}
                  type="button"
                  disabled={!!switching}
                  onClick={function() { handleSelect(loc); }}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {loc.name}
                      {loc.is_default && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-purple-500">Default</span>
                      )}
                    </p>
                    {loc.address && <p className="text-xs text-gray-400 truncate mt-0.5">{loc.address}</p>}
                  </div>
                  {isSwitching ? (
                    <span className="shrink-0 w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="shrink-0 text-gray-300">{'→'}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={function() { router.push('/owner/overview'); }}
          className="w-full mt-4 text-center text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
        >
          {'←'} Back to Owner Dashboard
        </button>
      </div>
    </div>
  );
}

export default withAuth(SelectBranchPage);
