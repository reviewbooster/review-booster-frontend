import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "./Sidebar";
import InstallAppBanner from './InstallAppBanner';
import SpotlightTour from './SpotlightTour';
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { ProductFeaturesProvider } from "../context/ProductFeaturesContext";

export default function DashboardLayout({ children, title, subtitle, showBack = true }) {
  const { user } = useAuth();
  const router = useRouter();
  const [unresolvedCount,     setUnresolvedCount]     = useState(0);
  const [resetRequestCount,   setResetRequestCount]   = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        if (user?.role === "super_admin") {
          const { data } = await api.get("/business/reset-requests");
          setResetRequestCount((data.data ?? []).length);
        } else {
          const { data } = await api.get("/reviews/private?page=1&limit=1");
          setUnresolvedCount(data.totalUnresolved ?? 0);
        }
      } catch {
        // Silently ignore -- badges are non-critical
      }
    };
    if (user) fetchCounts();
  }, [user]);

  return (
    <ProductFeaturesProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar unresolvedCount={unresolvedCount} resetRequestCount={resetRequestCount} />
        <main className="flex-1 min-w-0 md:ml-60 px-4 md:px-8 pt-16 pb-24 md:pt-8 md:pb-8 min-h-screen">
          <InstallAppBanner />
          {(title || showBack) && (
            <div className="flex items-center gap-3 mb-4">
              {showBack && (
                <button
                  type="button"
                  onClick={() => router.back()}
                  aria-label="Go back"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              {title && (
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
                  {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
                </div>
              )}
            </div>
          )}
          {children}
        </main>
        <SpotlightTour />
      </div>
    </ProductFeaturesProvider>
  );
}