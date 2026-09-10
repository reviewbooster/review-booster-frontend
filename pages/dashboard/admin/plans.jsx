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
          ai_reply:  form.ai_reply,
          engine_a:  form.engine_a,
          engine_b:  form.engine_b,
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
          <label className="label">Price / month (\u20b9)</label>
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

      <div className="space-y-2 mb-4">
        <label className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 cursor-pointer">
          <span className="text-sm text-gray-700">AI Reply Drafts</span>
          <input type="checkbox" checked={form.ai_reply} onChange={function(e) { set('ai_reply', e.target.checked); }} />
        </label>
        <label className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 cursor-pointer">
          <span className="text-sm text-gray-700">Customer Referrals (Engine A)</span>
          <input type="checkbox" checked={form.engine_a} onChange={function(e) { set('engine_a', e.target.checked); }} />
        </label>
        <label className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 cursor-pointer">
          <span className="text-sm text-gray-700">Refer a Business (Engine B)</span>
          <input type="checkbox" checked={form.engine_b} onChange={function(e) { set('engine_b', e.target.checked); }} />
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

function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {plans.map(function(plan) {
            return <PlanCard key={plan.slug} plan={plan} onSaved={handleSaved} />;
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

export default withAuth(PlansPage);