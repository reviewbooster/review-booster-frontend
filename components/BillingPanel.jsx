/**
 * components/BillingPanel.jsx
 * The full billing UI — status banner, plan cards, UPI payment modal —
 * extracted from what used to be its own page so it can be embedded
 * directly inside Settings. No DashboardLayout/page-header here; the
 * page that renders this owns that.
 */
import { useState, useEffect, useCallback } from 'react';
import QRCode from 'react-qr-code';
import api from '../lib/api';

function daysLeft(dateStr) {
  if (!dateStr) return null;
  var diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

function StatusBanner({ status }) {
  if (!status) return null;

  if (status.is_suspended) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-4 mb-6">
        <p className="text-sm font-semibold text-red-600">Account suspended</p>
        <p className="text-xs text-red-500 mt-1">
          Your plan has expired. Pick a plan below and pay to get reactivated.
        </p>
      </div>
    );
  }

  if (status.plan === 'trial') {
    var left = daysLeft(status.trial_ends_at);
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 mb-6">
        <p className="text-sm font-semibold text-amber-700">
          {left !== null && left >= 0 ? 'Trial \u2014 ' + left + ' day' + (left === 1 ? '' : 's') + ' left' : 'Trial'}
        </p>
        <p className="text-xs text-amber-600 mt-1">
          Pick a plan below any time to continue after your trial ends.
        </p>
      </div>
    );
  }

  var expLeft = daysLeft(status.plan_expires_at);
  return (
    <div className="rounded-2xl border border-green-100 bg-green-50 p-4 mb-6">
      <p className="text-sm font-semibold text-green-700 capitalize">{status.plan} plan \u2014 Active</p>
      <p className="text-xs text-green-600 mt-1">
        {status.plan_expires_at
          ? 'Renews / expires on ' + new Date(status.plan_expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
            (expLeft !== null ? ' (' + expLeft + ' day' + (expLeft === 1 ? '' : 's') + ')' : '')
          : 'No expiry date set.'}
      </p>
    </div>
  );
}

function PaymentModal({ plan, onClose }) {
  const [info,    setInfo]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [copied,  setCopied]  = useState(false);

  useEffect(function() {
    setLoading(true);
    setError('');
    api.get('/billing/payment-info', { params: { plan: plan.slug } })
      .then(function(res) { setInfo(res.data.data); })
      .catch(function() { setError('Failed to load payment details.'); })
      .finally(function() { setLoading(false); });
  }, [plan.slug]);

  function handleCopyUpi() {
    if (!info?.upi_id) return;
    navigator.clipboard.writeText(info.upi_id).then(function() {
      setCopied(true);
      setTimeout(function() { setCopied(false); }, 2000);
    }).catch(function() {});
  }

  function handleWhatsapp() {
    var number = (info?.contact_whatsapp || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
    var msg = "Hi! I'd like to upgrade to the " + plan.name + " plan on ReviewBooster" +
      (plan.price_monthly ? ' (\u20B9' + plan.price_monthly + '/mo)' : '') +
      ". I've made the UPI payment \u2014 please confirm and activate my account.";
    var url = number
      ? 'https://wa.me/' + number + '?text=' + encodeURIComponent(msg)
      : 'https://wa.me/?text=' + encodeURIComponent(msg);
    window.open(url, '_blank');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">Pay for {plan.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {info?.referral_discount_applied ? (
                <>
                  <span className="line-through text-gray-300 mr-1">{'\u20B9' + info.plan.original_price_monthly}</span>
                  <span className="text-green-600 font-semibold">{'\u20B9' + info.plan.price_monthly + ' / month'}</span>
                </>
              ) : (
                plan.price_monthly ? '\u20B9' + plan.price_monthly + ' / month' : 'Contact us for pricing'
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 rounded-full border-4 animate-spin"
                style={{ borderColor: '#E9D5FF', borderTopColor: '#7C3AED' }} />
            </div>
          ) : error ? (
            <p className="text-red-500 text-sm text-center py-8">{error}</p>
          ) : !info?.upi_id ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-600 mb-4">
                Payment details haven't been set up yet. Message us on WhatsApp and we'll help you upgrade directly.
              </p>
              <button
                onClick={handleWhatsapp}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#25D366' }}
              >
                Message us on WhatsApp
              </button>
            </div>
          ) : (
            <>
              {info.upi_uri && (
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-2xl border-2 border-gray-100">
                    <QRCode
                      value={info.upi_uri}
                      size={180}
                      level="H"
                      fgColor="#111827"
                      bgColor="#ffffff"
                    />
                  </div>
                </div>
              )}
              {info.referral_discount_applied && (
                <div className="rounded-xl bg-green-50 border border-green-100 px-3 py-2 mb-4 text-center">
                  <p className="text-xs font-semibold text-green-700">
                    {'\uD83C\uDF81 Referral discount applied \u2014 pay just \u20B9' + info.plan.price_monthly + ' instead of \u20B9' + info.plan.original_price_monthly}
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-400 text-center mb-4">
                Scan with any UPI app (GPay, PhonePe, Paytm...) to pay.
              </p>
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 mb-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-gray-400">UPI ID</p>
                  <p className="text-sm font-mono font-semibold text-gray-800 truncate">{info.upi_id}</p>
                </div>
                <button
                  onClick={handleCopyUpi}
                  className="shrink-0 text-gray-400 hover:text-purple-600 transition-colors px-2"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              {info.upi_payee_name && (
                <p className="text-xs text-gray-400 mb-4">Payee name: {info.upi_payee_name}</p>
              )}
              {info.instructions && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 mb-4 leading-relaxed">
                  {info.instructions}
                </p>
              )}
              <button
                onClick={handleWhatsapp}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 mb-3"
                style={{ backgroundColor: '#25D366' }}
              >
                I've Paid \u2014 Notify on WhatsApp
              </button>
              <p className="text-[11px] text-gray-400 text-center">
                Your plan is activated by our team after we confirm the payment \u2014 usually within a few hours.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BillingPanel() {
  const [status,      setStatus]      = useState(null);
  const [plans,       setPlans]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);

  const load = useCallback(async function() {
    setLoading(true);
    setError('');
    try {
      const [statusRes, plansRes] = await Promise.all([
        api.get('/billing/my-status'),
        api.get('/billing/plans'),
      ]);
      setStatus(statusRes.data.data);
      setPlans(plansRes.data.data || []);
    } catch (e) {
      setError('Failed to load billing information.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(function() { load(); }, [load]);

  return (
    <>
      {selectedPlan && (
        <PaymentModal plan={selectedPlan} onClose={function() { setSelectedPlan(null); }} />
      )}

      {error && <div className="alert-error mb-5"><span>!</span><span>{error}</span></div>}

      {loading ? (
        <div className="space-y-4">
          <div className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map(function(_, i) {
              return <div key={i} className="h-64 bg-white rounded-2xl border border-gray-100 animate-pulse" />;
            })}
          </div>
        </div>
      ) : (
        <>
          <StatusBanner status={status} />

          {plans.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="empty-state">
                <p className="empty-icon">{'\uD83D\uDCB3'}</p>
                <p className="empty-title">No plans available yet</p>
                <p className="empty-desc">Check back soon, or reach out to us directly.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {plans.map(function(plan) {
                var isCurrent = status && status.plan === plan.slug && !status.is_suspended;
                return (
                  <div
                    key={plan.slug}
                    className={'bg-white rounded-2xl border p-6 flex flex-col ' +
                      (isCurrent ? 'border-purple-300 ring-2 ring-purple-100' : 'border-gray-100')}
                  >
                    {isCurrent && (
                      <span className="badge badge-blue self-start mb-3">Current Plan</span>
                    )}
                    <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-2 mb-1">
                      {plan.price_monthly > 0 ? '\u20B9' + plan.price_monthly : 'Contact us'}
                      {plan.price_monthly > 0 && <span className="text-sm font-normal text-gray-400">/mo</span>}
                    </p>
                    <ul className="space-y-2 my-4 flex-1">
                      {(plan.features || []).length === 0 ? (
                        <li className="text-xs text-gray-400">No features listed yet.</li>
                      ) : plan.features.map(function(f, i) {
                        return (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="text-green-500 mt-0.5">{'\u2713'}</span>
                            <span>{f}</span>
                          </li>
                        );
                      })}
                    </ul>
                    <button
                      onClick={function() { setSelectedPlan(plan); }}
                      disabled={isCurrent}
                      className={isCurrent ? 'btn-secondary w-full justify-center opacity-60 cursor-not-allowed' : 'btn-primary w-full justify-center'}
                    >
                      {isCurrent ? 'Active' : 'Upgrade to ' + plan.name}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}
