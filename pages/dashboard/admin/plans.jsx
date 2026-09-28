/**
 * pages/dashboard/admin/plans.jsx
 * Super Admin — edit plan pricing/marketing copy AND the actual feature
 * limits enforced per plan (customer cap, staff cap, AI Reply, Engine A
 * customer referrals, Engine B refer-a-business). Backed by the Plan
 * collection; changes take effect immediately (backend clears its cache
 * on save).
 */
import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import withAuth from '../../../components/withAuth';
import api from '../../../lib/api';

function PlanCard({ plan, onSaved }) {
  const [form, setForm] = useState({
    name: plan.name || '',
    price_monthly: plan.price_monthly != null ? String(plan.price_monthly) : '0',
    features: (plan.features || []).join('\n'),
    is_active: !!plan.is_active,
    customers: (plan.limits && plan.limits.customers != null) ? String(plan.limits.customers) : '',
    staff: (plan.limits && plan.limits.staff != null) ? String(plan.limits.staff) : '',
    ai_reply: !!(plan.limits && plan.limits.ai_reply),
    engine_a: !!(plan.limits && plan.limits.engine_a),
    engine_b: !!(plan.limits && plan.limits.engine_b),
    win_back: !!(plan.limits && plan.limits.win_back),
    analytics: !!(plan.limits && plan.limits.analytics),
    custom_templates: !!(plan.limits && plan.limits.custom_templates),
    review_requests: (plan.limits && plan.limits.review_requests != null) ? String(plan.limits.review_requests) : '',
    sms: (plan.limits && plan.limits.sms != null) ? String(plan.limits.sms) : '',
    ai_replies: (plan.limits && plan.limits.ai_replies != null) ? String(plan.limits.ai_replies) : '',
    follow_ups: (plan.limits && plan.limits.follow_ups != null) ? String(plan.limits.follow_ups) : '',
    win_back_contacts: (plan.limits && plan.limits.win_back_contacts != null) ? String(plan.limits.win_back_contacts) : '',
    locations: (plan.limits && plan.limits.locations != null) ? String(plan.limits.locations) : '1',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  var set = function(key, val) { setForm(function(f) { return Object.assign({}, f, { [key]: val }); }); };

  var handleSave = async function() {
    setSaving(true);
    setError('');
    try {
      var payload = {
        name: form.name,
        price_monthly: Number(form.price_monthly) || 0,
        features: form.features.split('\n').map(function(s) { return s.trim(); }).filter(Boolean),
        is_active: form.is_active,
        limits: {
          customers: form.customers.trim() === '' ? null : Number(form.customers),
          staff:     form.staff.trim() === '' ? null : Number(form.staff),
          ai_reply:  form.ai_replies.trim() !== '0',
          engine_a:  form.engine_a,
          engine_b:  form.engine_b,
          win_back:  form.win_back_contacts.trim() !== '0',
          analytics: form.analytics,
          custom_templates:  form.custom_templates,
          review_requests:   form.review_requests.trim() === '' ? null : Number(form.review_requests),
          sms:               form.sms.trim() === '' ? null : Number(form.sms),
          ai_replies:        form.ai_replies.trim() === '' ? null : Number(form.ai_replies),
          follow_ups:        form.follow_ups.trim() === '' ? null : Number(form.follow_ups),
          win_back_contacts: form.win_back_contacts.trim() === '' ? null : Number(form.win_back_contacts),
          locations:         form.locations.trim() === '' ? 1 : Number(form.locations),
        },
      };
      var res = await api.patch('/admin/plans/' + plan.slug, payload);
      onSaved(res.data.data);
      setSaved(true);
      setTimeout(function() { setSaved(false); }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900 capitalize">{plan.slug}</h3>
        <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer">
          <input type="checkbox" checked={form.is_active} onChange={function(e) { set('is_active', e.target.checked); }} />
          Active
        </label>
      </div>

      {error && <div className="alert-error mb-3"><span>{'\u26A0'}</span><span>{error}</span></div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="label">Display Name</label>
          <input className="input" value={form.name} onChange={function(e) { set('name', e.target.value); }} />
        </div>
        <div>
          <label className="label">{'Price / month (\u20b9)'}</label>
          <input className="input" type="number" min="0" value={form.price_monthly} onChange={function(e) { set('price_monthly', e.target.value); }} />
        </div>
      </div>

      <div className="mb-4">
        <label className="label">Marketing Features (one per line)</label>
        <textarea
          className="input"
          rows={4}
          value={form.features}
          onChange={function(e) { set('features', e.target.value); }}
          placeholder={'Unlimited review requests\nWhatsApp + SMS sending\nBasic analytics'}
        />
      </div>

      <div className="h-px bg-gray-100 my-4" />

      <p className="text-xs font-semibold text-gray-700 mb-3">{'Feature Limits \u2014 what this plan actually unlocks'}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="label">Customer Limit</label>
          <input className="input" type="number" min="0" placeholder="Unlimited" value={form.customers} onChange={function(e) { set('customers', e.target.value); }} />
          <p className="text-[10px] text-gray-400 mt-1">Leave blank for unlimited.</p>
        </div>
        <div>
          <label className="label">Staff Accounts Limit</label>
          <input className="input" type="number" min="0" placeholder="Unlimited" value={form.staff} onChange={function(e) { set('staff', e.target.value); }} />
          <p className="text-[10px] text-gray-400 mt-1">Leave blank for unlimited.</p>
        </div>
      </div>

      <p className="text-xs font-semibold text-gray-700 mb-3">{'Monthly Quotas \u2014 reset on the 1st of every month (0 = not available on this plan)'}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="label">Review Requests / month</label>
          <input className="input" type="number" min="0" placeholder="Unlimited" value={form.review_requests} onChange={function(e) { set('review_requests', e.target.value); }} />
          <p className="text-[10px] text-gray-400 mt-1">Leave blank for unlimited.</p>
        </div>
        <div>
          <label className="label">SMS / month</label>
          <input className="input" type="number" min="0" placeholder="Unlimited" value={form.sms} onChange={function(e) { set('sms', e.target.value); }} />
          <p className="text-[10px] text-gray-400 mt-1">Leave blank for unlimited, 0 for unavailable.</p>
        </div>
        <div>
          <label className="label">AI Reply Generations / month</label>
          <input className="input" type="number" min="0" placeholder="Unlimited" value={form.ai_replies} onChange={function(e) { set('ai_replies', e.target.value); }} />
          <p className="text-[10px] text-gray-400 mt-1">Leave blank for unlimited, 0 for unavailable.</p>
        </div>
        <div>
          <label className="label">Follow-ups / month</label>
          <input className="input" type="number" min="0" placeholder="Unlimited" value={form.follow_ups} onChange={function(e) { set('follow_ups', e.target.value); }} />
          <p className="text-[10px] text-gray-400 mt-1">Leave blank for unlimited, 0 for unavailable.</p>
        </div>
        <div>
          <label className="label">Win-Back Contacts / month</label>
          <input className="input" type="number" min="0" placeholder="Unlimited" value={form.win_back_contacts} onChange={function(e) { set('win_back_contacts', e.target.value); }} />
          <p className="text-[10px] text-gray-400 mt-1">Leave blank for unlimited, 0 for unavailable.</p>
        </div>
        <div>
          <label className="label">Locations</label>
          <input className="input" type="number" min="1" value={form.locations} onChange={function(e) { set('locations', e.target.value); }} />
          <p className="text-[10px] text-gray-400 mt-1">{'Display only \u2014 not enforced yet.'}</p>
        </div>
      </div>

      <div className="h-px bg-gray-100 my-4" />

      <p className="text-xs font-semibold text-gray-700 mb-3">{'Feature Toggles'}</p>

      <div className="space-y-2 mb-4">

        <label className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 cursor-pointer">
          <span className="text-sm text-gray-700">Customer Referrals (Engine A)</span>
          <input type="checkbox" checked={form.engine_a} onChange={function(e) { set('engine_a', e.target.checked); }} />
        </label>
        <label className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 cursor-pointer">
          <span className="text-sm text-gray-700">Refer a Business (Engine B)</span>
          <input type="checkbox" checked={form.engine_b} onChange={function(e) { set('engine_b', e.target.checked); }} />
        </label>

        <label className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 cursor-pointer">
          <span className="text-sm text-gray-700">Advanced Analytics</span>
          <input type="checkbox" checked={form.analytics} onChange={function(e) { set('analytics', e.target.checked); }} />
        </label>
        <label className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 cursor-pointer">
          <span className="text-sm text-gray-700">Custom Message Templates</span>
          <input type="checkbox" checked={form.custom_templates} onChange={function(e) { set('custom_templates', e.target.checked); }} />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save Plan'}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">{'\u2713 Saved'}</span>}
      </div>
    </div>
  );
}

// Compact tile shown in the list -- tapping it opens that plan's settings.
function PlanSummary({ plan, onOpen }) {
  var l = plan.limits || {};
  var fmt = function(n) { return n == null ? 'Unlimited' : Number(n).toLocaleString('en-IN'); };
  var active = plan.is_active !== false;
  var priceText = plan.price_monthly > 0
    ? '\u20B9' + Number(plan.price_monthly).toLocaleString('en-IN') + '/month'
    : (plan.slug === 'free' ? 'Free' : 'Price not set');
  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-purple-300 hover:shadow transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-bold text-gray-900">{plan.name || plan.slug}</h3>
          <p className={'text-lg font-bold mt-0.5 ' + (priceText === 'Price not set' ? 'text-amber-600' : 'text-gray-900')}>{priceText}</p>
        </div>
        <span className={'text-[10px] font-semibold px-2 py-0.5 rounded-full ' + (active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500')}>
          {active ? 'Active' : 'Hidden'}
        </span>
      </div>
      <p className="text-xs text-gray-500">{fmt(l.review_requests) + ' requests/mo \u00b7 ' + fmt(l.customers) + ' customers \u00b7 ' + fmt(l.ai_replies) + ' AI replies'}</p>
      <p className="text-[11px] text-purple-600 font-semibold mt-3">{'Tap to edit settings \u2192'}</p>
    </button>
  );
}

function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedSlug, setSelectedSlug] = useState(null);

  useEffect(function() {
    api.get('/admin/plans')
      .then(function(res) { setPlans(res.data.data || []); })
      .catch(function() { setError('Failed to load plans.'); })
      .finally(function() { setLoading(false); });
  }, []);

  var handleSaved = function(updatedPlan) {
    setPlans(function(prev) {
      return prev.map(function(p) { return p.slug === updatedPlan.slug ? updatedPlan : p; });
    });
  };

  var selected = plans.find(function(p) { return p.slug === selectedSlug; }) || null;

  return (
    <DashboardLayout>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Plans & Feature Limits</h1>
      <p className="text-xs text-gray-400 mb-5">
        {'Control pricing, marketing copy, and what each plan actually unlocks. Changes apply immediately \u2014 no restart needed.'}
      </p>

      {error && <div className="alert-error mb-4"><span>{'\u26A0'}</span><span>{error}</span></div>}

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {plans.map(function(plan) {
              return <PlanSummary key={plan.slug} plan={plan} onOpen={function() { setSelectedSlug(plan.slug); }} />;
            })}
          </div>

          {selected && (
            <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-sm overflow-y-auto">
              <div className="w-full max-w-2xl my-4">
                <div className="flex justify-end mb-2">
                  <button
                    type="button"
                    onClick={function() { setSelectedSlug(null); }}
                    className="bg-white text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow">
                    {'Close \u2715'}
                  </button>
                </div>
                <PlanCard key={selected.slug} plan={selected} onSaved={handleSaved} />
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

export default withAuth(PlansPage);