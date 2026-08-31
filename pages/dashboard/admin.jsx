import { useState, useEffect, useCallback } from "react";
import QRCode from "react-qr-code";
import DashboardLayout from "../../components/DashboardLayout";
import withAuth from "../../components/withAuth";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/router";

const BUSINESS_TYPES = ["gym", "salon", "clinic", "restaurant", "other"];

function CreateBusinessModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    owner_name: "", email: "", password: "",
    business_name: "", business_type: "gym", google_review_url: "",
  });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", {
        owner_name:        form.owner_name,
        owner_email:       form.email,
        owner_password:    form.password,
        business_name:     form.business_name,
        business_type:     form.business_type,
        google_review_url: form.google_review_url,
      });
      onCreated(data.business);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create business.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Create Business Account</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">X</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <div className="alert-error"><span>!</span><span>{error}</span></div>}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Owner Details</p>
          <div>
            <label className="label">Owner Name *</label>
            <input className="input" required placeholder="e.g. Rahul Sharma"
              value={form.owner_name} onChange={e => set("owner_name", e.target.value)} />
          </div>
          <div>
            <label className="label">Owner Email *</label>
            <input className="input" type="email" required placeholder="owner@business.com"
              value={form.email} onChange={e => set("email", e.target.value)} />
          </div>
          <div>
            <label className="label">Temporary Password *</label>
            <input className="input" required placeholder="Min 8 chars"
              value={form.password} onChange={e => set("password", e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">Owner will be forced to change this on first login.</p>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest pt-2">Business Details</p>
          <div>
            <label className="label">Business Name *</label>
            <input className="input" required placeholder="e.g. Fitness First Gym"
              value={form.business_name} onChange={e => set("business_name", e.target.value)} />
          </div>
          <div>
            <label className="label">Business Type *</label>
            <select className="input" value={form.business_type} onChange={e => set("business_type", e.target.value)}>
              {BUSINESS_TYPES.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Google Review URL *</label>
            <input className="input" required placeholder="https://g.page/r/..."
              value={form.google_review_url} onChange={e => set("google_review_url", e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? "Creating..." : "Create Business"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditGoogleUrlModal({ business, onClose, onUpdated }) {
  const [url,     setUrl]     = useState(business.google_review_url || "");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!url.startsWith("https://")) { setError("URL must start with https://"); return; }
    setError("");
    setLoading(true);
    try {
      await api.patch("/business/" + business._id + "/google-url", { google_review_url: url });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update URL.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-slide-up">
        <div className="p-6">
          <h2 className="font-bold text-gray-900 mb-1">Edit Google Review URL</h2>
          <p className="text-xs text-gray-400 mb-4">
            For <span className="font-semibold text-gray-700">{business.name}</span>.
          </p>
          {error && <div className="alert-error mb-4"><span>!</span><span>{error}</span></div>}
          <div className="mb-2">
            <label className="label">Google Review URL</label>
            <input className="input" placeholder="https://search.google.com/local/writereview?placeid=..."
              value={url} onChange={e => setUrl(e.target.value)} />
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Google Maps {"\u2192"} find the business {"\u2192"} Write a Review {"\u2192"} copy the URL.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} disabled={loading} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleSave} disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? "Saving..." : "Save URL"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({ business, onClose, onReset }) {
  const [password, setPassword] = useState("");
  const [done,     setDone]     = useState(false);
  const [email,    setEmail]    = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleReset = async () => {
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/business/" + business._id + "/reset-password", { new_password: password });
      setEmail(data.data.email);
      setDone(true);
      onReset();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-slide-up">
        <div className="p-6">
          {!done ? (
            <>
              <h2 className="font-bold text-gray-900 mb-1">Reset Password</h2>
              <p className="text-xs text-gray-400 mb-5">
                Set a new temporary password for <span className="font-semibold text-gray-700">{business.name}</span>.
                The owner will be forced to change it on next login.
              </p>
              {error && <div className="alert-error mb-4"><span>!</span><span>{error}</span></div>}
              <div className="mb-4">
                <label className="label">New Temporary Password</label>
                <input className="input" placeholder="Min 8 chars"
                  value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} disabled={loading} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button onClick={handleReset} disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-xl mx-auto mb-3">{"\u2713"}</div>
                <h2 className="font-bold text-gray-900">Password Reset</h2>
                <p className="text-xs text-gray-400 mt-1">Share these credentials with the owner</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-mono font-semibold text-gray-800">{email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Password</span>
                  <span className="font-mono font-semibold text-gray-800">{password}</span>
                </div>
              </div>
              <button onClick={onClose} className="btn-primary w-full justify-center">Done</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteBusinessModal({ business, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    try {
      await api.delete("/business/" + business._id);
      onDeleted(business._id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete business.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-slide-up">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-lg flex-shrink-0">!</div>
            <div>
              <h2 className="font-bold text-gray-900">Delete Business</h2>
              <p className="text-xs text-gray-400 mt-0.5">This cannot be undone</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Are you sure you want to delete <span className="font-semibold text-gray-900">{business.name}</span>?
          </p>
          <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg p-3 mb-5">
            This will permanently delete the business, owner account, all customers,
            review requests, reviews, feedback, and alerts.
          </p>
          {error && <div className="alert-error mb-4"><span>!</span><span>{error}</span></div>}
          <div className="flex gap-3">
            <button onClick={onClose} disabled={loading} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 justify-center flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors duration-150 disabled:opacity-50"
            >
              {loading ? "Deleting..." : "Delete Everything"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SuspendModal({ business, onClose, onUpdated }) {
  const isSuspending = !business.is_suspended;
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.patch("/business/" + business._id + "/suspend");
      onUpdated(data.data.is_suspended);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Action failed.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-slide-up">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={"w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 " + (isSuspending ? "bg-red-100" : "bg-green-100")}>
              {isSuspending ? "!" : "\u2713"}
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{isSuspending ? "Suspend Business" : "Enable Business"}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{isSuspending ? "Immediate effect" : "Restore access"}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            {isSuspending ? "Suspend " : "Enable "}
            <span className="font-semibold text-gray-900">{business.name}</span>?
          </p>
          {isSuspending
            ? <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg p-3 mb-5">The owner will be logged out immediately and cannot log back in until re-enabled. All data is preserved.</p>
            : <p className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-lg p-3 mb-5">The owner will be able to log in and access their account immediately.</p>
          }
          {error && <div className="alert-error mb-4"><span>!</span><span>{error}</span></div>}
          <div className="flex gap-3">
            <button onClick={onClose} disabled={loading} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={"flex-1 justify-center flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors duration-150 disabled:opacity-50 " + (isSuspending ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600")}
            >
              {loading ? (isSuspending ? "Suspending..." : "Enabling...") : (isSuspending ? "Suspend" : "Enable")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewQrModal({ business, onClose }) {
  const [qrData,  setQrData]  = useState(null);
  const [qrUrl,   setQrUrl]   = useState('');
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [copied,  setCopied]  = useState(false);

  useEffect(function() {
    api.get('/business/' + business._id + '/qr')
      .then(function(res) {
        var d = res.data.data;
        setQrData(d);
        setQrUrl(window.location.origin + '/qr/' + d.qr_token);
      })
      .catch(function() { setError('Failed to load QR code.'); })
      .finally(function() { setLoading(false); });
  }, [business._id]);

  function handleCopy() {
    navigator.clipboard.writeText(qrUrl).then(function() {
      setCopied(true);
      setTimeout(function() { setCopied(false); }, 2000);
    }).catch(function() {});
  }

  function handleDownloadPng() {
    var svgEl = document.getElementById('admin-qr-svg');
    if (!svgEl || !qrData) return;
    var svgData = new XMLSerializer().serializeToString(svgEl);
    var canvas  = document.createElement('canvas');
    canvas.width = 480; canvas.height = 480;
    var ctx  = canvas.getContext('2d');
    var img  = new Image();
    var blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    var burl = URL.createObjectURL(blob);
    img.onload = function() {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 480, 480);
      ctx.drawImage(img, 0, 0, 480, 480);
      URL.revokeObjectURL(burl);
      var link = document.createElement('a');
      link.href     = canvas.toDataURL('image/png');
      link.download = business.name.replace(/\s+/g, '-').toLowerCase() + '-qr-code.png';
      link.click();
    };
    img.src = burl;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">QR Code</h2>
            <p className="text-xs text-gray-400 mt-0.5">{business.name}</p>
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
          ) : qrData ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="relative p-3 rounded-2xl border-2 border-gray-100">
                  <QRCode
                    id="admin-qr-svg"
                    value={qrUrl}
                    size={160}
                    level="H"
                    fgColor="#111827"
                    bgColor="#ffffff"
                  />
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center shadow-md"
                    style={{ width: '36px', height: '36px', backgroundColor: '#7C3AED' }}
                  >
                    <span style={{ color: '#fff', fontSize: '18px', lineHeight: 1 }}>{'\u2605'}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm font-bold text-gray-900 text-center mb-3">{business.name}</p>
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 mb-4">
                <p className="text-[10px] text-gray-400 truncate flex-1">{qrUrl}</p>
                <button
                  onClick={handleCopy}
                  className="shrink-0 text-gray-400 hover:text-purple-600 transition-colors"
                >
                  {copied ? (
                    <svg width="13" height="13" fill="none" stroke="#7C3AED" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path strokeLinecap="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  )}
                </button>
              </div>
              <button
                onClick={handleDownloadPng}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 mb-3"
                style={{ backgroundColor: '#7C3AED' }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PNG
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AdminPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [businesses,    setBusinesses]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [toast,         setToast]         = useState("");
  const [showCreate,    setShowCreate]    = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [resetTarget,   setResetTarget]   = useState(null);
  const [editUrlTarget, setEditUrlTarget] = useState(null);
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [qrTarget,      setQrTarget]      = useState(null);

  useEffect(() => {
    if (user && user.role !== "super_admin") router.replace("/dashboard");
  }, [user, router]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/business");
      setBusinesses(data.data ?? []);
    } catch {
      setError("Failed to load businesses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (biz) => { setBusinesses(prev => [biz, ...prev]); showToast("Business created!"); };
  const handleDeleted = (id)  => { setBusinesses(prev => prev.filter(b => b._id !== id)); showToast("Business deleted."); };

  if (user?.role !== "super_admin") return null;

  return (
    <DashboardLayout>
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 alert-success shadow-lg animate-slide-up">
          <span>{"\u2713"}</span><span>{toast}</span>
        </div>
      )}
      {showCreate    && <CreateBusinessModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {editUrlTarget && (
        <EditGoogleUrlModal
          business={editUrlTarget}
          onClose={() => setEditUrlTarget(null)}
          onUpdated={() => { load(); showToast("Google URL updated."); }}
        />
      )}
      {suspendTarget && (
        <SuspendModal
          business={suspendTarget}
          onClose={() => setSuspendTarget(null)}
          onUpdated={(newStatus) => {
            setBusinesses(prev => prev.map(b => b._id === suspendTarget._id ? { ...b, is_suspended: newStatus } : b));
            showToast(newStatus ? "Business suspended." : "Business enabled.");
          }}
        />
      )}
      {resetTarget && (
        <ResetPasswordModal
          business={resetTarget}
          onClose={() => setResetTarget(null)}
          onReset={() => showToast("Password reset successfully.")}
        />
      )}
      {deleteTarget && (
        <DeleteBusinessModal
          business={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
      {qrTarget && (
        <ViewQrModal
          business={qrTarget}
          onClose={() => setQrTarget(null)}
        />
      )}

      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-subtitle">{businesses.length} business{businesses.length !== 1 ? "es" : ""} registered</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ Create Business</button>
      </div>

      {error && <div className="alert-error mb-5"><span>!</span><span>{error}</span></div>}

      {/* Mobile card list */}
      <div className="md:hidden space-y-3 mb-5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-gray-100 animate-pulse" />
          ))
        ) : businesses.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <p className="empty-icon">{"\uD83C\uDFE2"}</p>
              <p className="empty-title">No businesses yet</p>
              <p className="empty-desc">Create the first business account above.</p>
            </div>
          </div>
        ) : businesses.map(b => (
          <div key={b._id} className={"bg-white rounded-xl border border-gray-100 p-4 " + (b.is_suspended ? "opacity-60" : "")}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 mr-3">
                <p className="font-semibold text-gray-900 truncate">{b.name}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{b._id}</p>
              </div>
              {b.is_suspended
                ? <span className="badge badge-red flex-shrink-0">Suspended</span>
                : <span className="badge badge-green flex-shrink-0">Active</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="badge badge-green capitalize">{b.type}</span>
              <span className="badge badge-blue capitalize">{b.plan}</span>
              <span className="text-xs text-gray-400">
                {new Date(b.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => setQrTarget(b)}
                className="w-full py-2 px-3 text-xs font-semibold rounded-xl text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#7C3AED' }}
              >
                {'\uD83D\uDCF1'} View QR Code
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setEditUrlTarget(b)}
                  className="py-2 px-3 text-xs font-semibold rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">
                  Edit URL
                </button>
                <button onClick={() => setResetTarget(b)}
                  className="py-2 px-3 text-xs font-semibold rounded-xl border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors">
                  Reset PW
                </button>
                <button
                  onClick={() => setSuspendTarget(b)}
                  className={"py-2 px-3 text-xs font-semibold rounded-xl border transition-colors " +
                    (b.is_suspended ? "border-green-200 text-green-600 hover:bg-green-50" : "border-orange-200 text-orange-500 hover:bg-orange-50")}
                >
                  {b.is_suspended ? "Enable" : "Suspend"}
                </button>
                <button onClick={() => setDeleteTarget(b)}
                  className="py-2 px-3 text-xs font-semibold rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="table-wrapper hidden md:block">
        <table className="table">
          <thead>
            <tr>
              <th>Business</th><th>Type</th><th>Plan</th><th>Status</th><th>Created</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                  <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : businesses.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="empty-state">
                  <p className="empty-icon">{"\uD83C\uDFE2"}</p>
                  <p className="empty-title">No businesses yet</p>
                  <p className="empty-desc">Create the first business account above.</p>
                </div>
              </td></tr>
            ) : businesses.map(b => (
              <tr key={b._id} className={b.is_suspended ? "opacity-60" : ""}>
                <td>
                  <span className="font-semibold text-gray-900">{b.name}</span>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{b._id}</p>
                </td>
                <td><span className="badge badge-green capitalize">{b.type}</span></td>
                <td><span className="badge badge-blue capitalize">{b.plan}</span></td>
                <td>
                  {b.is_suspended
                    ? <span className="badge badge-red">Suspended</span>
                    : <span className="badge badge-green">Active</span>}
                </td>
                <td className="text-gray-400 text-xs">
                  {new Date(b.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQrTarget(b)}
                      className="py-1.5 px-3 text-xs font-semibold rounded-xl text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: '#7C3AED' }}
                    >
                      QR Code
                    </button>
                    <button onClick={() => setEditUrlTarget(b)}
                      className="py-1.5 px-3 text-xs font-semibold rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors duration-150">
                      Edit URL
                    </button>
                    <button onClick={() => setResetTarget(b)}
                      className="py-1.5 px-3 text-xs font-semibold rounded-xl border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors duration-150">
                      Reset Password
                    </button>
                    <button
                      onClick={() => setSuspendTarget(b)}
                      className={"py-1.5 px-3 text-xs font-semibold rounded-xl border transition-colors duration-150 " + (b.is_suspended ? "border-green-200 text-green-600 hover:bg-green-50" : "border-orange-200 text-orange-500 hover:bg-orange-50")}
                    >
                      {b.is_suspended ? "Enable" : "Suspend"}
                    </button>
                    <button onClick={() => setDeleteTarget(b)}
                      className="py-1.5 px-3 text-xs font-semibold rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors duration-150">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(AdminPage);