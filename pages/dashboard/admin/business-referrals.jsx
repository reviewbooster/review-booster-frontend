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

function BusinessReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
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

  function set(key, value) {
    setSaved(false);
    setSettings(function(s) { return Object.assign({}, s, { [key]: value }); });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await api.patch('/admin/business-referral-settings', settings);
      setSaved(true);
      setTimeout(function() { setSaved(false); }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

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

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Business Referrals</h1>
        <p className="text-xs text-gray-400 mb-5">
          Businesses that refer other businesses to ReviewBooster (Engine B): what they earn, and the referrals waiting to be credited.
        </p>

        {error && <div className="alert-error mb-4"><span>{'\u26A0'}</span><span>{error}</span></div>}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Reward settings</h3>
          {loading ? (
            <div className="h-24 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
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
              <div className="flex items-center gap-3 pt-1">
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
                {saved && <span className="text-sm text-green-600 font-medium">{'\u2713 Saved'}</span>}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
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
      </div>
    </DashboardLayout>
  );
}

export default withAuth(BusinessReferralsPage);