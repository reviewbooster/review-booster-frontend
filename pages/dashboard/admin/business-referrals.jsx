/**
 * pages/dashboard/admin/business-referrals.jsx
 * Super Admin -> Business Referrals (Engine B), as a real page (it used to be
 * a pop-up inside the Businesses screen): the reward settings for businesses
 * that refer other businesses, and the queue of referrals waiting to be
 * credited.
 */
import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import withAuth from '../../../components/withAuth';
import api from '../../../lib/api';

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function RewardSettingsModal({ initialSettings, onClose, onSaved }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  function set(key, value) {
    setSettings(function(s) { return Object.assign({}, s, { [key]: value }); });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await api.patch('/admin/business-referral-settings', settings);
      onSaved(settings);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Reward Settings</h2>
            <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">X</button>
          </div>
          {error && <div className="alert-error mb-4"><span>{'\u26A0'}</span><span>{error}</span></div>}
          <div className="space-y-3">
            <div>
              <label className="label">Reward text shown to the referring business</label>
              <textarea className="input" rows={2} value={settings.referrer_reward_text}
                onChange={function(e) { set('referrer_reward_text', e.target.value); }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Reward type</label>
                <select className="input" value={settings.referrer_reward_type}
                  onChange={function(e) { set('referrer_reward_type', e.target.value); }}>
                  <option value="discount_pct">% off next renewal</option>
                  <option value="free_days">Free days</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div>
                <label className="label">Reward value</label>
                <input className="input" type="number" min="0" value={settings.referrer_reward_value}
                  onChange={function(e) { set('referrer_reward_value', Number(e.target.value)); }} />
              </div>
            </div>
            <div>
              <label className="label">{"New business's one-time signup discount (%)"}</label>
              <input className="input" type="number" min="0" max="100" value={settings.referred_discount_pct}
                onChange={function(e) { set('referred_discount_pct', Number(e.target.value)); }} />
              <p className="text-xs text-gray-400 mt-1">{"Auto-shown on their first plan's payment screen. Payment itself is still manual."}</p>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={onClose} disabled={saving} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BusinessReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [settings, setSettings] = useState({
    referrer_reward_type: 'discount_pct',
    referrer_reward_value: 20,
    referrer_reward_text: '',
    referred_discount_pct: 10,
  });
  const [signups,        setSignups]        = useState([]);
  const [signupsLoading, setSignupsLoading] = useState(true);
  const [creditingId,    setCreditingId]    = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(function() {
    api.get('/admin/business-referral-settings')
      .then(function(res) { setSettings(res.data.data); })
      .catch(function() { setError('Failed to load settings.'); })
      .finally(function() { setLoading(false); });

    api.get('/admin/business-referrals')
      .then(function(res) { setSignups(res.data.data || []); })
      .catch(function() {})
      .finally(function() { setSignupsLoading(false); });
  }, []);

  async function handleMarkCredited(id) {
    setCreditingId(id);
    try {
      await api.post('/admin/business-referrals/' + id + '/mark-credited');
      setSignups(function(prev) {
        return prev.map(function(s) { return s._id === id ? Object.assign({}, s, { credited: true, credited_at: new Date().toISOString() }) : s; });
      });
    } catch (err) {
      // the row just stays pending; they can retry
    } finally {
      setCreditingId(null);
    }
  }

  var pending  = signups.filter(function(s) { return !s.credited; });
  var credited = signups.filter(function(s) { return s.credited; });

  // Top Referrers -- computed from the same signups list already loaded.
  // There's no click/view tracking on referral links, so every signup
  // record here already is a conversion; there's no separate "conversion
  // rate" to show on top of that.
  var topReferrers = (function() {
    var counts = {};
    signups.forEach(function(s) {
      var key = s.referrer_business_id || s.referrer_name;
      if (!counts[key]) counts[key] = { name: s.referrer_name, total: 0, credited: 0 };
      counts[key].total += 1;
      if (s.credited) counts[key].credited += 1;
    });
    return Object.values(counts).sort(function(a, b) { return b.total - a.total; }).slice(0, 5);
  })();

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        {showSettingsModal && (
          <RewardSettingsModal
            initialSettings={settings}
            onClose={function() { setShowSettingsModal(false); }}
            onSaved={function(saved) {
              setSettings(saved);
              setShowSettingsModal(false);
            }}
          />
        )}

        <div className="flex items-start justify-between gap-3 mb-1">
          <h1 className="text-xl font-bold text-gray-900">Business Referrals</h1>
          <button onClick={function() { setShowSettingsModal(true); }}
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-purple-300 transition-colors">
            Reward Settings
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-1">
          Businesses that refer other businesses to ReviewBooster (Engine B): what they earn, and the referrals waiting to be credited.
        </p>
        {!loading && settings.referrer_reward_text && (
          <p className="text-xs text-gray-400 mb-5">{settings.referrer_reward_text}</p>
        )}
        {loading && <div className="mb-5" />}

        {error && <div className="alert-error mb-4"><span>{'\u26A0'}</span><span>{error}</span></div>}

        {!signupsLoading && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xl font-bold text-gray-900">{signups.length}</p>
              <p className="text-[11px] text-gray-400 mt-1">Businesses referred</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xl font-bold text-gray-900">{credited.length}</p>
              <p className="text-[11px] text-gray-400 mt-1">Credited</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xl font-bold text-gray-900">{pending.length}</p>
              <p className="text-[11px] text-gray-400 mt-1">Pending</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {'Pending credits' + (pending.length > 0 ? ' (' + pending.length + ')' : '')}
          </h3>
          {signupsLoading ? (
            <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
          ) : pending.length === 0 ? (
            <p className="text-xs text-gray-400">No pending credits right now.</p>
          ) : (
            <div className="space-y-2">
              {pending.map(function(s) {
                return (
                  <div key={s._id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-amber-50">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{s.referrer_name}</p>
                      <p className="text-xs text-gray-500">{'referred ' + s.new_business_name}</p>
                    </div>
                    <button
                      onClick={function() { handleMarkCredited(s._id); }}
                      disabled={creditingId === s._id}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50">
                      {creditingId === s._id ? '...' : 'Mark Credited'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {credited.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">{'Already credited (' + credited.length + ')'}</p>
              <div className="divide-y divide-gray-50">
                {credited.map(function(s) {
                  return (
                    <div key={s._id} className="flex items-center justify-between py-2">
                      <p className="text-xs text-gray-600">{s.referrer_name + ' \u2192 ' + s.new_business_name}</p>
                      <p className="text-[11px] text-gray-400">{s.credited_at ? fmtDate(s.credited_at) : ''}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {!signupsLoading && topReferrers.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Top Referrers</h3>
            <div className="divide-y divide-gray-50">
              {topReferrers.map(function(r, i) {
                return (
                  <div key={i} className="flex items-center justify-between py-2">
                    <p className="text-sm text-gray-700">{r.name}</p>
                    <p className="text-xs text-gray-400">{r.total + ' referred \u00b7 ' + r.credited + ' credited'}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default withAuth(BusinessReferralsPage);