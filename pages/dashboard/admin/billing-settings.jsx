/**
 * pages/dashboard/admin/billing-settings.jsx
 * Super Admin -> Billing Settings, as a real page (it used to be a pop-up
 * inside the Businesses screen): the payment details owners see when they
 * upgrade, and the free-trial rules for new signups. Plan names, prices and
 * limits are edited on the Plans page.
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/DashboardLayout';
import withAuth from '../../../components/withAuth';
import api from '../../../lib/api';

function BillingSettingsPage() {
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState('');
  const [settings, setSettings] = useState({
    upi_id: '', upi_payee_name: '', contact_whatsapp: '', instructions: '',
    trial_days: '14', trial_plan: 'growth',
  });

  useEffect(function() {
    api.get('/admin/platform-settings')
      .then(function(res) {
        var d = res.data.data || {};
        setSettings({
          upi_id: d.upi_id || '',
          upi_payee_name: d.upi_payee_name || '',
          contact_whatsapp: d.contact_whatsapp || '',
          instructions: d.instructions || '',
          trial_days: d.trial_days != null ? String(d.trial_days) : '14',
          trial_plan: d.trial_plan || 'growth',
        });
      })
      .catch(function() { setError('Failed to load billing settings.'); })
      .finally(function() { setLoading(false); });
  }, []);

  function set(key, value) {
    setSaved(false);
    setSettings(function(s) { return Object.assign({}, s, { [key]: value }); });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await api.patch('/admin/platform-settings', settings);
      setSaved(true);
      setTimeout(function() { setSaved(false); }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save billing settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Billing Settings</h1>
        <p className="text-xs text-gray-400 mb-5">
          Payment details owners see when they upgrade, and the free trial every new signup gets.
          Plan names, prices and limits are on the{' '}
          <Link href="/dashboard/admin/plans" className="text-purple-600 font-semibold hover:text-purple-700">Plans page</Link>.
        </p>

        {error && <div className="alert-error mb-4"><span>{'\u26A0'}</span><span>{error}</span></div>}

        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Payment details (shown to owners)</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">UPI ID</label>
                  <input className="input" placeholder="yourname@upi" value={settings.upi_id}
                    onChange={function(e) { set('upi_id', e.target.value); }} />
                </div>
                <div>
                  <label className="label">UPI Payee Name</label>
                  <input className="input" placeholder="Adcend / ReviewBooster" value={settings.upi_payee_name}
                    onChange={function(e) { set('upi_payee_name', e.target.value); }} />
                </div>
                <div>
                  <label className="label">WhatsApp Contact Number</label>
                  <input className="input" placeholder="+91XXXXXXXXXX" value={settings.contact_whatsapp}
                    onChange={function(e) { set('contact_whatsapp', e.target.value); }} />
                </div>
                <div>
                  <label className="label">Payment Instructions</label>
                  <textarea className="input" rows={3} maxLength={500}
                    placeholder="e.g. After paying, message us on WhatsApp with a screenshot to get activated faster."
                    value={settings.instructions}
                    onChange={function(e) { set('instructions', e.target.value); }} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Free trial for new signups</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Trial length (days)</label>
                  <input className="input" type="number" min="1" max="90" value={settings.trial_days}
                    onChange={function(e) { set('trial_days', e.target.value); }} />
                </div>
                <div>
                  <label className="label">Trial gives access to</label>
                  <select className="input" value={settings.trial_plan}
                    onChange={function(e) { set('trial_plan', e.target.value); }}>
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 mt-3">
                Length applies to new signups only; existing trials keep their end date. The plan applies to
                everyone currently on a trial, immediately. When a trial ends, the business moves to the Free plan.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Save Billing Settings'}
              </button>
              {saved && <span className="text-sm text-green-600 font-medium">{'\u2713 Saved'}</span>}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default withAuth(BillingSettingsPage);