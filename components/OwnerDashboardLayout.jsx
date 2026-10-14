/**
 * components/OwnerDashboardLayout.jsx
 *
 * Phase 2: the Owner Dashboard's own page shell, mirroring
 * DashboardLayout.jsx's structure (same background, spacing, title/back
 * pattern -- spec section 11 visual-consistency requirement) but wrapping
 * content with <OwnerSidebar /> instead of the branch dashboard's
 * <Sidebar />. Every owner page is rendered through this, never through
 * DashboardLayout -- per spec section 10, owner pages must stay inside
 * the Owner Dashboard shell, never redirect into the branch dashboard.
 */
import OwnerSidebar from "./OwnerSidebar";

export default function OwnerDashboardLayout({ children, title, subtitle }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <OwnerSidebar />
      <main className="flex-1 min-w-0 md:ml-60 px-4 md:px-8 pt-16 pb-24 md:pt-8 md:pb-8 min-h-screen">
        {(title || subtitle) && (
          <div className="mb-4">
            {title && <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>}
            {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
