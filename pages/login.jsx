/**
 * pages/login.jsx
 *
 * Login screen. Connects to POST /api/auth/login.
 * On success: stores token in AuthContext, redirects to dashboard or change-password.
 * Already-authenticated users are redirected away immediately.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

// Replace with your real WhatsApp support number, E.164 digits only (no +, no spaces)
const SUPPORT_WHATSAPP_NUMBER = '919584417319';

const FAQS = [
  {
    q: 'I forgot my password. What do I do?',
    a: 'Click "Forgot password?" below the login form and follow the emailed reset link.',
  },
  {
    q: 'How long does account approval take?',
    a: 'New business signups are reviewed by our team, usually within 24 hours.',
  },
  {
    q: 'How does the review request flow work?',
    a: '4-5 star ratings redirect customers to leave a public Google review. 1-3 star ratings go to a private feedback form only you can see.',
  },
  {
    q: 'Is my customer data secure?',
    a: 'Yes. All data is encrypted in transit, and each business\u2019s data is fully isolated from every other business on the platform.',
  },
];

function HelpButton() {
  const [open, setOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [token, setToken] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatStatus, setChatStatus] = useState('open');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [input, setInput] = useState('');
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(function() {
    if (typeof window === 'undefined') return;
    var saved = localStorage.getItem('rb_support_chat_token');
    if (saved) setToken(saved);
  }, []);

  var refreshChat = function(t) {
    api.get('/support-chat/' + t)
      .then(function(res) {
        setMessages(res.data?.data?.messages || []);
        setChatStatus(res.data?.data?.status || 'open');
      })
      .catch(function() {});
  };

  useEffect(function() {
    if (!open || !token) return;
    refreshChat(token);
    var interval = setInterval(function() { refreshChat(token); }, 20000);
    return function() { clearInterval(interval); };
  }, [open, token]);

  var handleStartChat = function(e) {
    e.preventDefault();
    setFormError('');
    if (!name.trim())  { setFormError('Please enter your name.'); return; }
    if (!email.trim()) { setFormError('Please enter your email.'); return; }
    if (!input.trim()) { setFormError('Please enter a message.'); return; }
    setStarting(true);
    api.post('/support-chat/start', { name: name.trim(), email: email.trim(), message: input.trim() })
      .then(function(res) {
        var t = res.data?.data?.token;
        setToken(t);
        setMessages(res.data?.data?.messages || []);
        if (typeof window !== 'undefined') localStorage.setItem('rb_support_chat_token', t);
        setInput('');
      })
      .catch(function(err) { setFormError(err.response?.data?.error || 'Could not start chat. Please try again.'); })
      .finally(function() { setStarting(false); });
  };

  var handleSendMessage = function(e) {
    e.preventDefault();
    if (!input.trim() || !token) return;
    setSending(true);
    api.post('/support-chat/' + token + '/messages', { message: input.trim() })
      .then(function(res) {
        setMessages(res.data?.data?.messages || []);
        setInput('');
      })
      .catch(function() {})
      .finally(function() { setSending(false); });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 w-12 h-12 rounded-full bg-brand-500 hover:bg-brand-600 text-white shadow-lg flex items-center justify-center transition-colors"
        aria-label="Help"
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-6 bg-black/40">
          <div className="w-full sm:w-80 bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <h2 className="font-bold text-gray-900 text-sm">Help & Support</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                Frequently Asked Questions
              </p>
              <div className="space-y-1.5 mb-4">
                {FAQS.map(function(item, i) {
                  var isOpen = openFaq === i;
                  return (
                    <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : i)}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span className="pr-2">{item.q}</span>
                        <span className="text-gray-300 shrink-0">{isOpen ? '\u2212' : '+'}</span>
                      </button>
                      {isOpen && (
                        <p className="px-3.5 pb-3 text-xs text-gray-500 leading-relaxed">{item.a}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                Chat with us
              </p>

              {!token ? (
                <form onSubmit={handleStartChat} className="space-y-2">
                  {formError && <p className="text-xs text-red-500">{formError}</p>}
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-200"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <input
                    type="email"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-200"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <textarea
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-200 resize-none"
                    rows={3}
                    placeholder="How can we help?"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={starting}
                    className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {starting ? 'Starting...' : 'Start Chat'}
                  </button>
                </form>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {messages.map(function(m, i) {
                      var isAdmin = m.sender === 'admin';
                      return (
                        <div key={i} className={'flex ' + (isAdmin ? 'justify-start' : 'justify-end')}>
                          <p className={'text-xs rounded-xl px-3 py-2 max-w-[85%] ' +
                            (isAdmin ? 'bg-gray-100 text-gray-700' : 'bg-brand-500 text-white')}>
                            {m.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <form onSubmit={handleSendMessage} className="flex gap-2 mt-1">
                    <input
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-200"
                      placeholder="Type a message..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={sending || !input.trim()}
                      className="shrink-0 px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      Send
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe,   setRememberMe]   = useState(false);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('rb_suspended');
        if (rememberMe) localStorage.setItem('rb_remember', '1');
        else localStorage.removeItem('rb_remember');
      }
      login(data);

      if (data.must_change_password) {
        router.replace('/change-password');
      } else {
        router.replace('/dashboard');
      }
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'PENDING_APPROVAL') { router.replace('/pending-approval'); return; }
      if (code === 'ACCOUNT_REJECTED') { router.replace('/account-rejected'); return; }
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">

      <style jsx>{`
        .login-password-input:-webkit-autofill,
        .login-password-input:-webkit-autofill:hover,
        .login-password-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #fff;
          -webkit-box-shadow: 0 0 0px 1000px rgba(255,255,255,0.06) inset;
          transition: background-color 9999s ease-in-out 0s;
        }
      `}</style>

      <HelpButton />

      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-slide-up">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-3xl">{"\u2B50"}</span>
            <span className="text-white font-bold text-2xl tracking-tight">
              Review<span className="text-brand-500">Booster</span>
            </span>
          </div>
          <p className="text-white/40 text-sm">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">

          {router.query.reason === 'suspended' && !error && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
              <span className="mt-0.5 shrink-0">{"\u26A0"}</span>
              <span>Account suspended. Please contact your administrator.</span>
            </div>
          )}
          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
              <span className="mt-0.5 shrink-0">{"\u26A0"}</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-white/70 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors duration-150"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/70 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
className="login-password-input w-full px-4 py-3 pr-11 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(function(v) { return !v; })}
                  aria-label="Toggle password visibility"
className="absolute inset-y-0 right-0 flex items-center px-3.5 text-white/30 hover:text-white/70 transition-colors duration-150">
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12
                           19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112
                           4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293
                           5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21
                           21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242
                           4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12
                           4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0
                           .639C20.577 16.49 16.64 19.5 12 19.5c-4.638
                           0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500/30 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors">
                  Remember me
                </span>
              </label>
              <a href="/forgot-password"
                className="text-xs text-white/40 hover:text-white/70 transition-colors duration-150">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <span className="spinner w-4 h-4" />
                  Signing in...
                </>
              ) : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/25 text-xs mt-6">
          Don't have an account?{' '}<a href="/signup" className="text-brand-500/70 hover:text-brand-500 transition-colors duration-150">Sign up</a>
        </p>

        <p className="text-center mt-2">
          <span className="text-white/20 text-xs">Powered by </span>
          <span className="text-white/35 text-xs font-semibold">Adcend</span>
        </p>

      </div>
    </div>
  );
}
