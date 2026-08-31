import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import withAuth from "../../components/withAuth";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/router";

function ResetPasswordModal({ user, onClose, onReset }) {
  const [password, setPassword] = useState("");
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleReset = async () => {
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError("");
    setLoading(true);
    try {
      await api.post("/business/" + user.business_id._id + "/reset-password", { new_password: password });
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
              <p className="text-xs text-gray-400 mb-1">
                <span className="font-semibold text-gray-700">{user.name}</span> — {user.email}
              </p>
              <p className="text-xs text-gray-400 mb-5">
                Business: <span className="font-semibold text-gray-700">{user.business_id?.name}</span>
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
                  <span className="font-mono font-semibold text-gray-800">{user.email}</span>
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

function RequestsPage() {
  const { user }  = useAuth();
  const router    = useRouter();

  const [requests,     setRequests]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [toast,        setToast]        = useState("");
  const [resetTarget,  setResetTarget]  = useState(null);

  useEffect(() => {
    if (user && user.role !== "super_admin") router.replace("/dashboard");
  }, [user, router]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/business/reset-requests");
      setRequests(data.data ?? []);
    } catch {
      setError("Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleReset = (userId) => {
    setRequests(prev => prev.filter(r => r._id !== userId));
    showToast("Password reset. Share credentials with the owner.");
  };

  if (user?.role !== "super_admin") return null;

  return (
    <DashboardLayout>
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 alert-success shadow-lg animate-slide-up">
          <span>{"\u2713"}</span><span>{toast}</span>
        </div>
      )}
      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onReset={() => handleReset(resetTarget._id)} />
      )}

      <div className="page-header">
        <h1 className="page-title">Password Reset Requests</h1>
        <p className="page-subtitle">{requests.length} pending request{requests.length !== 1 ? "s" : ""}</p>
      </div>

      {error && <div className="alert-error mb-5"><span>!</span><span>{error}</span></div>}

      {/* Mobile card list */}
      <div className="md:hidden space-y-3 mb-5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-gray-100 animate-pulse" />
          ))
        ) : requests.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <p className="empty-icon">{"\u2713"}</p>
              <p className="empty-title">No pending requests</p>
              <p className="empty-desc">All password reset requests have been handled.</p>
            </div>
          </div>
        ) : requests.map(r => (
          <div key={r._id} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="mb-3">
              <p className="font-semibold text-gray-900">{r.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{r.email}</p>
              <p className="text-xs text-gray-500 mt-1">
                {r.business_id?.name ?? "-"} {r.business_id?.type ? "(" + r.business_id.type + ")" : ""}
              </p>
            </div>
            <button onClick={() => setResetTarget(r)}
              className="w-full py-2 px-4 text-sm font-semibold rounded-xl border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors">
              Reset Password
            </button>
          </div>
        ))}
      </div>

      <div className="table-wrapper hidden md:block">
        <table className="table">
          <thead>
            <tr>
              <th>Owner</th><th>Business</th><th>Type</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 4 }).map((_, j) => (
                  <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : requests.length === 0 ? (
              <tr><td colSpan={4}>
                <div className="empty-state">
                  <p className="empty-icon">{"\u2713"}</p>
                  <p className="empty-title">No pending requests</p>
                  <p className="empty-desc">All password reset requests have been handled.</p>
                </div>
              </td></tr>
            ) : requests.map(r => (
              <tr key={r._id}>
                <td>
                  <span className="font-semibold text-gray-900">{r.name}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{r.email}</p>
                </td>
                <td className="font-medium text-gray-700">{r.business_id?.name ?? "—"}</td>
                <td><span className="badge badge-green capitalize">{r.business_id?.type ?? "—"}</span></td>
                <td>
                  <button onClick={() => setResetTarget(r)}
                    className="py-1.5 px-3 text-xs font-semibold rounded-xl border border-amber-200
                               text-amber-600 hover:bg-amber-50 transition-colors duration-150">
                    Reset Password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(RequestsPage);