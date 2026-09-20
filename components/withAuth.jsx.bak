import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";

export default function withAuth(WrappedPage, options = {}) {
  const { requiredRole } = options;

  function AuthGuard(props) {
    const { user, isLoading, isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (isLoading) return;
      if (!isAuthenticated) { router.replace("/login"); return; }
      if (user?.must_change_password) { router.replace("/change-password"); return; }

      // Super admin belongs only in the admin panel
      const superAdminPaths = ["/dashboard/admin", "/dashboard/requests"];
      if (user?.role === "super_admin" && !superAdminPaths.some(p => router.pathname.startsWith(p))) {
        router.replace("/dashboard/admin");
        return;
      }

      if (requiredRole && user?.role !== requiredRole && user?.role !== "super_admin") {
        router.replace("/dashboard");
      }
    }, [isLoading, isAuthenticated, user, router]);

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
    const superAdminPaths = ["/dashboard/admin", "/dashboard/requests"];
    if (user?.role === "super_admin" && !superAdminPaths.some(p => router.pathname.startsWith(p))) return null;
    if (requiredRole && user?.role !== requiredRole && user?.role !== "super_admin") return null;

    return <WrappedPage {...props} />;
  }

  AuthGuard.displayName = `withAuth(${WrappedPage.displayName || WrappedPage.name || "Component"})`;
  return AuthGuard;
}