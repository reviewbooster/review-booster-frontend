import { useState } from "react";
import { useRouter } from "next/router";
import api from "../lib/api";

export default function ForgotPasswordPage() {
  const router  = useRouter();
  const [email,   setEmail]   = useState("");
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setSuccess(data.message);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-3xl">{"\u2B50"}</span>
            <span className="text-white font-bold text-2xl tracking-tight">
              Review<span className="text-brand-500">Booster</span>
            </span>
          </div>
          <p className="text-white/40 text-sm">Reset your password</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20
                            text-red-400 text-sm flex items-start gap-2">
              <span className="shrink-0">{"\u26A0"}</span>
              <span>{error}</span>
            </div>
          )}
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-2xl mx-auto">
                {"\u2713"}
              </div>
              <p className="text-white/80 text-sm">{success}</p>
              <p className="text-white/40 text-xs">Your administrator will reset your password and share the new credentials with you.</p>
              <button onClick={() => router.push("/login")}
                className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-sm
                           hover:bg-brand-600 transition-all duration-150">
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-white/50 text-sm">
                Enter your email address and your administrator will be notified to reset your password.
              </p>
              <div>
                <label className="block text-sm font-semibold text-white/70 mb-1.5">Email address</label>
                <input
                  type="email" required autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@business.com"
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5
                             text-white placeholder-white/25 text-sm
                             focus:outline-none focus:ring-2 focus:ring-brand-500/50
                             transition-colors duration-150" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-sm
                           hover:bg-brand-600 active:scale-[0.98]
                           transition-all duration-150 disabled:opacity-50
                           flex items-center justify-center gap-2">
                {loading ? "Sending..." : "Request Password Reset"}
              </button>
              <button type="button" onClick={() => router.push("/login")}
                className="w-full py-3 rounded-xl border border-white/10 text-white/50 text-sm
                           hover:text-white hover:border-white/20 transition-all duration-150">
                Back to Login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}