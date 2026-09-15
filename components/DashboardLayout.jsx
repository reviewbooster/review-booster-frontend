import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import InstallAppBanner from './InstallAppBanner';
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function DashboardLayout({ children }) {
  const { user } = useAuth();
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
        // Silently ignore â€” badges are non-critical
      }
    };
    if (user) fetchCounts();
  }, [user]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar unresolvedCount={unresolvedCount} resetRequestCount={resetRequestCount} />
      <main className="flex-1 md:ml-60 px-4 md:px-8 pt-16 pb-24 md:pt-8 md:pb-8 min-h-screen">
        <InstallAppBanner />
        {children}
      </main>
    </div>
  );
}
