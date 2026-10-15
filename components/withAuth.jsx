import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";

export default function withAuth(WrappedPage, options = {}) {
  const { requiredRole } = options;

  function AuthGuard(props) {
    const { user, isLoading, isAuthenticated } = useAuth();
    const router = useRouter();

    // Captured once, synchronously, on mount -- true only when this page
    // instance was reached via select-branch.jsx's deliberate switch (see
    // its comment). Consumed immediately so a later bookmark/back-button
    // visit to /dashboard never sees it again. Reading it this way (not
    // inside an effect) keeps the render-guard below and the redirect
    // effect in agreement on the very first render, instead of racing.
    const [justSwitchedBranch] = useState(() => {
      if (typeof window === "undefined") return false;
      const flag = sessionStorage.getItem("rb_branch_switch") === "1";
      if (flag) sessionStorage.removeItem("rb_branch_switch");
      return flag;
    });

    useEffect(() => {
      if (isLoading) return;
      if (!isAuthenticated) { router.replace("/login"); return; }
      if (user?.must_change_password) { router.replace("/change-password"); return; }

      // New businesses land here until they finish (or skip) the post-signup
      // setup wizard -- exempts /onboarding itself to avoid a redirect loop.
      if (user?.onboarding_completed === false && !router.pathname.startsWith("/onboarding")) {
        router.replace("/onboarding");
        return;
      }

      // Super admin belongs only in the admin panel -- lands on the real
      // Dashboard page, not the bare Businesses list.
      const superAdminPaths = ["/dashboard/admin", "/dashboard/requests"];
      if (user?.role === "super_admin" && !superAdminPaths.some(p => router.pathname.startsWith(p))) {
        router.replace("/dashboard/admin/dashboard");
        return;
      }

      // Eligible multi-location owners landing on the bare branch-dashboard
      // root (bookmark, browser back, a stale link) default to the Owner
      // Dashboard instead -- but NOT right after a deliberate branch
      // switch via select-branch.jsx, which is the one legitimate reason
      // to land exactly here (see justSwitchedBranch above).
      if (user?.role === "owner" && user?.multi_location && router.pathname === "/dashboard" && !justSwitchedBranch) {
        router.replace("/owner");
        return;
      }

      if (requiredRole && user?.role !== requiredRole && user?.role !== "super_admin") {
        router.replace("/dashboard");
      }
    }, [isLoading, isAuthenticated, user, router, justSwitchedBranch]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-brand-500 border-t-transparent rounded-full animate-spin"
                 style={{ borderWidth: 3, borderStyle: "solid" }} />
            <p className="text-sm text-gray-400 font-medium">Loading...</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated || user?.must_change_password) return null;
    if (user?.onboarding_completed === false && !router.pathname.startsWith("/onboarding")) return null;
    const superAdminPaths = ["/dashboard/admin", "/dashboard/requests"];
    if (user?.role === "super_admin" && !superAdminPaths.some(p => router.pathname.startsWith(p))) return null;
    if (user?.role === "owner" && user?.multi_location && router.pathname === "/dashboard" && !justSwitchedBranch) return null;
    if (requiredRole && user?.role !== requiredRole && user?.role !== "super_admin") return null;

    return <WrappedPage {...props} />;
  }

  AuthGuard.displayName = `withAuth(${WrappedPage.displayName || WrappedPage.name || "Component"})`;
  return AuthGuard;
}