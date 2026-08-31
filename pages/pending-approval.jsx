import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

export default function PendingApprovalPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(function() {
    if (!isLoading && isAuthenticated) { router.replace('/dashboard'); }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm text-center">

        <div className="inline-flex items-center gap-2 mb-8">
          <span className="text-3xl">{'\u2B50'}</span>
          <span className="text-white font-bold text-2xl tracking-tight">
            Review<span className="text-brand-500">Booster</span>
          </span>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">

          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-white text-xl font-bold mb-2">Account Under Review</h1>
          <p className="text-white/50 text-sm leading-relaxed mb-6">
            Your account has been created and is pending admin approval.
            You{'\u2019'}ll receive an email once your account is activated.
          </p>

          <div className="bg-white/5 rounded-xl p-4 mb-6 text-left">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">
              What happens next
            </p>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2.5 text-white/50 text-sm">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>Our team reviews your application</span>
              </li>
              <li className="flex items-start gap-2.5 text-white/50 text-sm">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>You get an email when approved</span>
              </li>
              <li className="flex items-start gap-2.5 text-white/50 text-sm">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span>Log in and start collecting reviews</span>
              </li>
            </ul>
          </div>

          <button
            onClick={function() { router.push('/login'); }}
            className="w-full py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-sm font-medium transition-all duration-150">
            Back to Login
          </button>
        </div>

        <p className="text-center mt-4">
          <span className="text-white/20 text-xs">Powered by </span>
          <span className="text-white/35 text-xs font-semibold">Adcend</span>
        </p>
      </div>
    </div>
  );
}