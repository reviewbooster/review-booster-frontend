/**
 * pages/dashboard/referrals.jsx
 * "Redeem a Referral" — the only place referral attribution actually
 * happens. Staff type the code a walk-in customer shows them, confirm who
 * referred them, and record the new customer. Also surfaces which
 * customers have earned a reward, and lets the owner edit the program's
 * offer/reward text.
 */
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import StaffPicker from '../../components/StaffPicker';

const AVATAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#0EA5E9'];
function avatarBg(idx) { return AVATAR_COLORS[idx % AVATAR_COLORS.length]; }

// Example placeholders shown in Settings, tailored to the business's own
// type so a gym owner sees gym examples, a dental clinic sees dental
// examples, etc. Falls back to a generic pair for 'other' or unknown types.
const TYPE_EXAMPLES = {
  salon:       { offer: 'Get 10% off your first visit',       reward: '1 free haircut' },
  barbershop:  { offer: 'Get 10% off your first visit',       reward: '1 free haircut' },
  gym:         { offer: 'Get a free trial session',           reward: '1 free month membership' },
  dental:      { offer: 'Get a free dental consultation',     reward: '1 free teeth cleaning' },
  clinic:      { offer: 'Get a free first consultation',      reward: '1 free check-up' },
  restaurant:  { offer: 'Get a free dessert with your order', reward: '1 free meal' },
  retail:      { offer: 'Get 10% off your first purchase',    reward: 'A free gift' },
  auto:        { offer: 'Get a free vehicle inspection',      reward: '1 free service' },
  real_estate: { offer: 'Get a free property consultation',   reward: 'A referral bonus' },
  education:   { offer: 'Get a free trial class',             reward: '1 free class' },
  pet_care:    { offer: 'Get 10% off your first visit',       reward: '1 free grooming session' },
  other:       { offer: 'Get a special welcome offer',        reward: 'A reward of your choice' },
};
function examplesFor(businessType) {
  return TYPE_EXAMPLES[businessType] || TYPE_EXAMPLES.other;
}

function RedeemCard() {
  const [code,        setCode]        = useState('');
  const [lookupState, setLookupState] = useState('idle'); // idle | loading | found | notfound
  const [lookup,      setLookup]      = useState(null);
  const [name,        setName]        = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone,       setPhone]       = useState('');
  const [email,       setEmail]       = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');
  const [result,      setResult]      = useState(null);
  const [redeemedBy,  setRedeemedBy]  = useState(null);

  var handleLookup = async function (e) {
    if (e) e.preventDefault();
    var clean = code.trim().toUpperCase();
    if (!clean) return;
    setLookupState('loading');
    setError('');
    setResult(null);
    try {
      var res = await api.get('/referrals/lookup/' + clean);
      setLookup(res.data.data);
      setLookupState('found');
    } catch (err) {
      setLookupState('notfound');
      setError(err.response?.data?.error || 'No customer has this code.');
    }
  };

  var resetAll = function () {
    setCode(''); setLookupState('idle'); setLookup(null);
    setName(''); setPhone(''); setEmail(''); setError(''); setResult(null); setRedeemedBy(null);
  };

  var handleRedeem = async function (e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Please enter the new customer\u2019s name.'); return; }
    setSubmitting(true);
    try {
      var payload = {
        code: lookup.code,
        name: name.trim(),
        phone: phone.trim() ? countryCode + phone.trim().replace(/^0+/, '') : null,
        email: email.trim() || null,
        redeemed_by: redeemedBy,
      };
      var res = await api.post('/referrals/redeem', payload);
      setResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4 text-center">
        <p className="text-4xl mb-2">{'\uD83C\uDF89'}</p>
        <p className="text-sm font-bold text-gray-900 mb-1">{name} added as a new customer!</p>
        <p className="text-xs text-gray-500 mb-4">
          {lookup.referrer_name + ' now has ' + result.redeemed_count + ' verified referral' + (result.redeemed_count === 1 ? '' : 's') + '.'}
        </p>
        {result.reward_just_earned && (
          <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: '#FEF3C7' }}>
            <p className="text-xs font-semibold" style={{ color: '#92400E' }}>
              {'\uD83C\uDF81 ' + lookup.referrer_name + ' just earned a reward! Check the list below.'}
            </p>
          </div>
        )}
        <button
          onClick={resetAll}
          className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#7C3AED' }}
        >
          Redeem Another
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
      <h2 className="text-sm font-bold text-gray-900 mb-1">Redeem a Referral</h2>
      <p className="text-xs text-gray-400 mb-4">Enter the code the customer shows you at checkout.</p>

      {lookupState !== 'found' && (
        <form onSubmit={handleLookup} className="flex gap-2 mb-2">
          <input
            value={code}
            onChange={function (e) { setCode(e.target.value.toUpperCase()); }}
            placeholder="e.g. 7K4P2X"
            maxLength={20}
            className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-sm font-mono tracking-widest text-center text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-200 uppercase"
          />
          <button
            type="submit"
            disabled={lookupState === 'loading' || !code.trim()}
            className="px-5 py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#7C3AED' }}
          >
            {lookupState === 'loading' ? '\u2026' : 'Look Up'}
          </button>
        </form>
      )}

      {lookupState === 'notfound' && error && (
        <div className="bg-red-50 text-red-500 text-xs rounded-lg px-3 py-2 mt-2">{error}</div>
      )}

      {lookupState === 'found' && lookup && (
        <>
          <div className="flex items-center gap-3 bg-purple-50 rounded-xl px-4 py-3 mb-4">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
              style={{ backgroundColor: '#7C3AED' }}
            >
              {lookup.referrer_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Referred by</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{lookup.referrer_name}</p>
            </div>
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white text-purple-600 shrink-0">
              {lookup.redeemed_count + ' so far'}
            </span>
          </div>

          <form onSubmit={handleRedeem}>
            {error && (
              <div className="bg-red-50 text-red-500 text-xs rounded-lg px-3 py-2 mb-3">{error}</div>
            )}
            <div className="mb-3">
              <input
                type="text"
                placeholder="New customer's name"
                value={name}
                onChange={function (e) { setName(e.target.value); }}
                className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
            <div className="mb-3 flex gap-2">
              <select
                value={countryCode}
                onChange={function (e) { setCountryCode(e.target.value); }}
                className="bg-gray-100 rounded-xl px-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-purple-200 shrink-0"
              >
                <option value="+91">{'\uD83C\uDDEE\uD83C\uDDF3 +91'}</option>
                <option value="+1">{'\uD83C\uDDFA\uD83C\uDDF8 +1'}</option>
                <option value="+44">{'\uD83C\uDDEC\uD83C\uDDE7 +44'}</option>
                <option value="+971">{'\uD83C\uDDE6\uD83C\uDDEA +971'}</option>
                <option value="+65">{'\uD83C\uDDF8\uD83C\uDDEC +65'}</option>
              </select>
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={phone}
                onChange={function (e) { setPhone(e.target.value); }}
                className="flex-1 min-w-0 bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
            <div className="mb-4">
              <input
                type="email"
                placeholder="Email (optional)"
                value={email}
                onChange={function (e) { setEmail(e.target.value); }}
                className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
            <StaffPicker value={redeemedBy} onChange={setRedeemedBy} label="Who redeemed this? (optional)" />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetAll}
                className="px-4 py-3 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#7C3AED' }}
              >
                {submitting ? 'Confirming\u2026' : 'Confirm Redemption'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

function RewardsCard({ isOwner }) {
  const [rewards,     setRewards]     = useState([]);
  const [rewardText,  setRewardText]  = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [claimingId,  setClaimingId]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/referrals/rewards');
      setRewards(data.data ?? []);
      setRewardText(data.reward_text ?? null);
    } catch {
      setRewards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  var handleMarkGiven = async function (customerId) {
    setClaimingId(customerId);
    try {
      await api.post('/referrals/rewards/' + customerId + '/claim');
      await load();
    } catch {
      // ignore, list will just stay as-is
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
      <h2 className="text-sm font-bold text-gray-900 mb-1">Rewards Earned</h2>
      <p className="text-xs text-gray-400 mb-4">
        {rewardText ? 'Customers who\u2019ve earned: ' + rewardText : 'Customers who\u2019ve hit your referral reward threshold.'}
      </p>

      {loading ? (
        <div className="space-y-2">
          {[0, 1].map(function (i) {
            return <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />;
          })}
        </div>
      ) : rewards.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">No rewards pending right now.</p>
      ) : (
        <div className="space-y-2">
          {rewards.map(function (r, i) {
            return (
              <div key={r.customer_id} className="flex items-center gap-3 bg-amber-50 rounded-xl px-3 py-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                  style={{ backgroundColor: avatarBg(i) }}
                >
                  {r.customer_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.customer_name}</p>
                  <p className="text-[11px] text-gray-500">{r.redeemed_count + ' verified referrals'}</p>
                </div>
                {r.unclaimed_rewards > 1 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 shrink-0">
                    {'x' + r.unclaimed_rewards}
                  </span>
                )}
                {isOwner && (
                  <button
                    onClick={function () { handleMarkGiven(r.customer_id); }}
                    disabled={claimingId === r.customer_id}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-white text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50 shrink-0"
                  >
                    {claimingId === r.customer_id ? '\u2026' : 'Mark as Given'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SettingsModal({ open, onClose, businessType }) {
  const [settings,   setSettings]   = useState(null);
  const [loading,     setLoading]   = useState(true);
  const [saving,      setSaving]    = useState(false);
  const [saved,       setSaved]     = useState(false);
  const examples = examplesFor(businessType);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get('/referrals/settings')
      .then(function (res) {
        setSettings(res.data.data);
      })
      .catch(function () {})
      .finally(function () { setLoading(false); });
  }, [open]);

  var handleSave = async function (e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const { data } = await api.patch('/referrals/settings', settings);
      setSettings(data.data);
      setSaved(true);
      setTimeout(function () { setSaved(false); }, 1500);
    } catch {
      // no-op; field-level errors aren't critical enough to block the form
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[85vh] overflow-y-auto"
        onClick={function (e) { e.stopPropagation(); }}
      >
        <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <p className="text-sm font-bold text-gray-900">Referral Program Settings</p>
            <p className="text-xs text-gray-400 mt-0.5">What friends see, and what earns a reward</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none shrink-0"
          >
            {'\u00D7'}
          </button>
        </div>

        {loading || !settings ? (
          <div className="p-5 space-y-3">
            {[0, 1, 2].map(function (i) {
              return <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />;
            })}
          </div>
        ) : (
          <form onSubmit={handleSave} className="px-5 py-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Offer for the new customer</label>
              <textarea
                value={settings.offer_text || ''}
                onChange={function (e) { setSettings({ ...settings, offer_text: e.target.value }); }}
                placeholder={'e.g. ' + examples.offer}
                rows={2}
                className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-200 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={settings.address || ''}
                onChange={function (e) { setSettings({ ...settings, address: e.target.value }); }}
                placeholder="e.g. 12 MG Road, Nashik"
                className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Instagram</label>
                <input
                  type="text"
                  value={settings.instagram || ''}
                  onChange={function (e) { setSettings({ ...settings, instagram: e.target.value }); }}
                  placeholder="@yourbusiness"
                  className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Facebook</label>
                <input
                  type="text"
                  value={settings.facebook || ''}
                  onChange={function (e) { setSettings({ ...settings, facebook: e.target.value }); }}
                  placeholder="@yourbusiness"
                  className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Other (website, YouTube, phone, etc.)</label>
              <textarea
                value={settings.other_contact || ''}
                onChange={function (e) { setSettings({ ...settings, other_contact: e.target.value }); }}
                placeholder={'One per line, e.g.\nYouTube: @yourbusiness\n+91 98765 43210'}
                rows={2}
                className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-200 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <div className="w-28 shrink-0">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Referrals needed</label>
                <input
                  type="number"
                  min={1}
                  value={settings.reward_threshold ?? 3}
                  onChange={function (e) { setSettings({ ...settings, reward_threshold: e.target.value }); }}
                  className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reward for the referrer</label>
                <input
                  type="text"
                  value={settings.reward_text || ''}
                  onChange={function (e) { setSettings({ ...settings, reward_text: e.target.value }); }}
                  placeholder={'e.g. ' + examples.reward}
                  className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#7C3AED' }}
            >
              {saving ? 'Saving\u2026' : saved ? '\u2713 Saved' : 'Save Settings'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, iconBg, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5">
      <div className={'w-8 h-8 rounded-lg flex items-center justify-center mb-2 ' + iconBg}>
        {icon}
      </div>
      <p className="text-lg font-bold text-gray-900 leading-none tabular-nums">{value}</p>
      <p className="text-[10px] text-gray-400 mt-1 leading-tight">{label}</p>
    </div>
  );
}

function StatsRow() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/referrals/stats').then(function (res) { setStats(res.data.data); }).catch(function () {});
  }, []);

  var s = stats || {};

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
      <StatCard
        iconBg="bg-purple-50"
        icon={<svg width="16" height="16" fill="none" stroke="#7C3AED" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 4v-2a4 4 0 00-3-3.87M9 12a4 4 0 100-8 4 4 0 000 8z" /></svg>}
        label="Total Referred"
        value={s.total_redeemed ?? 0}
      />
      <StatCard
        iconBg="bg-blue-50"
        icon={<svg width="16" height="16" fill="none" stroke="#3B82F6" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
        label="Active Referrers"
        value={s.active_referrers ?? 0}
      />
      <StatCard
        iconBg="bg-amber-50"
        icon={<span className="text-sm">{'\uD83C\uDF81'}</span>}
        label="Rewards Given"
        value={s.rewards_given ?? 0}
      />
      <StatCard
        iconBg="bg-green-50"
        icon={<svg width="16" height="16" fill="none" stroke="#10B981" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        label="Rewards Pending"
        value={s.rewards_pending ?? 0}
      />
    </div>
  );
}

function ReferrersCard() {
  const [referrers, setReferrers] = useState([]);
  const [loading,    setLoading]  = useState(true);

  useEffect(() => {
    api.get('/referrals/referrers')
      .then(function (res) { setReferrers(res.data.data ?? []); })
      .catch(function () { setReferrers([]); })
      .finally(function () { setLoading(false); });
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
      <h2 className="text-sm font-bold text-gray-900 mb-1">Top Referrers</h2>
      <p className="text-xs text-gray-400 mb-4">Everyone who has referred at least one customer, ranked by points.</p>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(function (i) {
            return <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />;
          })}
        </div>
      ) : referrers.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">No one has referred a customer yet.</p>
      ) : (
        <div className="space-y-2">
          {referrers.map(function (r, i) {
            return (
              <div key={r.customer_id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                  style={{ backgroundColor: avatarBg(i) }}
                >
                  {r.customer_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.customer_name}</p>
                  {r.rewards_claimed > 0 && (
                    <p className="text-[11px] text-gray-400">{r.rewards_claimed + ' reward' + (r.rewards_claimed === 1 ? '' : 's') + ' given'}</p>
                  )}
                </div>
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 shrink-0">
                  {r.points + ' point' + (r.points === 1 ? '' : 's')}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReferralsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [businessType, setBusinessType] = useState(null);

  useEffect(() => {
    api.get('/business/my-settings')
      .then(function (res) { setBusinessType(res.data.data?.type ?? null); })
      .catch(function () {});
  }, []);

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Referrals</h1>
          <p className="text-xs text-gray-400 mt-1">
            Verify a customer's referral code and track who's earned a reward.
          </p>
        </div>
        {isOwner && (
          <button
            onClick={function () { setSettingsOpen(true); }}
            title="Referral Program Settings"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-gray-200 text-gray-500 hover:text-purple-600 hover:border-purple-300 shadow-sm transition-colors shrink-0"
          >
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        )}
      </div>

      <StatsRow />
      <RedeemCard />
      <ReferrersCard />
      <RewardsCard isOwner={isOwner} />

      <SettingsModal open={settingsOpen} onClose={function () { setSettingsOpen(false); }} businessType={businessType} />
    </DashboardLayout>
  );
}

export default withAuth(ReferralsPage);
