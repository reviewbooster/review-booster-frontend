/**
 * components/OwnerComingSoon.jsx
 *
 * Phase 2 scaffolding only: the owner shell's 8 primary pages all need to
 * be real, navigable routes now (so the sidebar/bottom-bar isn't linking
 * to 404s), but their actual content -- Locations management (Phase 3),
 * combined Analytics/Reviews/Campaigns (Phase 4/5), Team & Permissions
 * (Phase 3), Reports and the owner Settings architecture (Phase 6) -- is
 * explicitly sequenced for later phases per the spec's own implementation
 * order (section 13). This is a clearly-labeled placeholder, not a silent
 * stub, so nothing here is mistaken for a finished feature.
 */
export default function OwnerComingSoon({ title, description }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col items-center text-center max-w-md mx-auto mt-8">
      <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 text-purple-500">
        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2.5" />
        </svg>
      </div>
      <h2 className="text-base font-bold text-gray-900 mb-1.5">{title}</h2>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}
