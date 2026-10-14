/**
 * components/OwnerSidebar.jsx
 *
 * Phase 2 (Owner Dashboard & Multi-Location spec, section 4): the Owner
 * Dashboard's OWN navigation -- a separate desktop sidebar + mobile bottom
 * bar from the branch dashboard's <Sidebar />. Never shared, per the
 * spec's core principle: "The Owner Dashboard is a distinct
 * business-management experience ... not a set of links that redirect
 * owners into the branch dashboard."
 *
 * Desktop: all 8 primary sections, plus "Switch to Branch Dashboard" as
 * its own action at the bottom (spec section 4 table).
 * Mobile: 5-item bottom bar (Home, Locations, Analytics, Reviews, More) --
 * "More" opens a drawer with the rest (Campaigns, Team & Permissions,
 * Reports, Settings, Switch to Branch Dashboard), matching the explicit
 * rule not to crowd the bar and never to show the desktop sidebar and
 * mobile bottom bar at the same time.
 *
 * "Switch to Branch Dashboard" never navigates straight to /dashboard --
 * it always goes to /dashboard/select-branch first (the mandatory branch
 * selector, spec section 3), which is what actually opens the branch
 * dashboard once a branch is chosen.
 */
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import ChangePasswordModal from "./ChangePasswordModal";

const OWNER_NAV = [
  { href: "/owner/overview",  label: "Overview",           icon: "home" },
  { href: "/owner/locations", label: "Locations",          icon: "pin" },
  { href: "/owner/analytics", label: "Analytics",          icon: "chart" },
  { href: "/owner/reviews",   label: "Reviews",             icon: "star" },
  { href: "/owner/campaigns", label: "Campaigns",          icon: "flag" },
  { href: "/owner/team",      label: "Team & Permissions", icon: "users" },
  { href: "/owner/reports",   label: "Reports",             icon: "doc" },
  { href: "/owner/settings",  label: "Settings",            icon: "gear" },
];

// The 4 real destinations on the mobile bottom bar; everything past this
// (Campaigns, Team, Reports, Settings, Switch) lives behind "More".
const MOBILE_PRIMARY = ["/owner/overview", "/owner/locations", "/owner/analytics", "/owner/reviews"];

function Icon({ name, active }) {
  var sw = active ? "2.2" : "1.8";
  var common = { fill: "none", stroke: "currentColor", strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "home") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" {...common}>
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    );
  }
  if (name === "pin") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" {...common}>
        <path d="M12 21s7-6.73 7-12a7 7 0 10-14 0c0 5.27 7 12 7 12z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    );
  }
  if (name === "chart") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" {...common}>
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M15 7h6v6" />
      </svg>
    );
  }
  if (name === "star") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }
  if (name === "flag") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" {...common}>
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <path d="M4 22v-7" />
      </svg>
    );
  }
  if (name === "users") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" {...common}>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    );
  }
  if (name === "doc") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" {...common}>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M9 13h6M9 17h6" />
      </svg>
    );
  }
  if (name === "gear") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    );
  }
  if (name === "switch") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" {...common}>
        <path d="M7 16V4m0 0L3 8m4-4l4 4" />
        <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }
  if (name === "more") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="5" cy="12" r="1.8" />
        <circle cx="12" cy="12" r="1.8" />
        <circle cx="19" cy="12" r="1.8" />
      </svg>
    );
  }
  return null;
}

export default function OwnerSidebar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moreOpen,     setMoreOpen]     = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const desktopRef = useRef(null);
  const mobileRef  = useRef(null);

  useEffect(function() { setMoreOpen(false); }, [router.pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!desktopRef.current?.contains(e.target) && !mobileRef.current?.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function isActive(href) {
    return router.pathname === href || router.pathname.startsWith(href + "/");
  }

  // Goes to the mandatory branch selector, never straight to /dashboard
  // (spec section 3: "Every switch from Owner Dashboard back to normal
  // Review Booster must display a branch selector. Never silently open
  // the last-used branch or a default branch.")
  function goSwitchToBranch() {
    setMoreOpen(false);
    setDropdownOpen(false);
    router.push("/dashboard/select-branch");
  }

  return (
    <>
      {/* -------- DESKTOP SIDEBAR -------- */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 bg-white border-r border-gray-100 flex-col z-30">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex flex-col items-start gap-1.5">
            <img src="/logo-lockup.png" alt="ReviewBooster" className="h-8 w-auto -ml-5 pointer-events-none" />
            <span className="inline-flex items-center px-1.5 py-1 rounded-md border border-purple-200 bg-purple-50 text-purple-700 text-[9px] font-bold uppercase tracking-wide leading-none">
              Owner Dashboard
            </span>
          </div>
        </div>

        {user && (
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-0.5">Business</p>
            <p className="text-gray-700 text-sm font-medium truncate">{user.name}</p>
            <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-600">
              {user.role}
            </span>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {OWNER_NAV.map(function(item) {
            var active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={"flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 " +
                  (active ? "bg-purple-50 text-purple-600" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50")}
              >
                <Icon name={item.icon} active={active} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-2 mt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={goSwitchToBranch}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all duration-150"
            >
              <Icon name="switch" />
              <span>Switch to Branch Dashboard</span>
            </button>
          </div>
        </nav>

        <div className="px-3 py-4 border-t border-gray-100" ref={desktopRef}>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-150"
            >
              <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="flex-1 text-left truncate">{user?.name || "Account"}</span>
              <svg className={"w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150 " + (dropdownOpen ? "rotate-180" : "")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-50">
                <button
                  onClick={() => { setDropdownOpen(false); setChangePasswordOpen(true); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <span>{"🔒"}</span>
                  Change Password
                </button>
                <div className="h-px bg-gray-100" />
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <span>{"⎋"}</span>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* -------- MOBILE TOP BAR -------- */}
      <div className="flex md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-100 z-30 items-center justify-between px-4">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/logo-lockup.png" alt="ReviewBooster" className="h-7 w-auto -ml-4 pointer-events-none" />
          <span className="inline-flex items-center px-1.5 py-1 rounded-md border border-purple-200 bg-purple-50 text-purple-700 text-[9px] font-bold uppercase tracking-wide leading-none">
            Owner
          </span>
        </div>
        <div className="relative" ref={mobileRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold active:scale-95 transition-transform"
            style={{ backgroundColor: "#7C3AED" }}
          >
            {user?.name?.[0]?.toUpperCase() || "U"}
          </button>
          {dropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-gray-900 text-sm font-semibold truncate">{user?.name}</p>
                <p className="text-gray-400 text-xs capitalize mt-0.5">{user?.role}</p>
              </div>
              <button
                onClick={goSwitchToBranch}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Icon name="switch" />
                Switch to Branch Dashboard
              </button>
              <button
                onClick={() => { setDropdownOpen(false); setChangePasswordOpen(true); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <span>{"🔒"}</span>
                Change Password
              </button>
              <div className="h-px bg-gray-100" />
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                <span>{"⎋"}</span>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* -------- MOBILE BOTTOM NAV (5 items: 4 primary + More) -------- */}
      <nav
        className="flex md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex justify-around w-full py-1">
          {OWNER_NAV.filter(function(item) { return MOBILE_PRIMARY.indexOf(item.href) !== -1; }).map(function(item) {
            var active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={"flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors " + (active ? "text-purple-600" : "text-gray-400")}
              >
                <Icon name={item.icon} active={active} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={"flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors " + (moreOpen ? "text-purple-600" : "text-gray-400")}
          >
            <Icon name="more" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* -------- MOBILE "MORE" DRAWER -------- */}
      <div
        className={"fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-300 " + (moreOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}
        onClick={() => setMoreOpen(false)}
      />
      <div
        className={"fixed inset-x-0 bottom-0 bg-white z-50 md:hidden rounded-t-2xl shadow-2xl transition-transform duration-300 " + (moreOpen ? "translate-y-0" : "translate-y-full")}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100">
          <p className="font-bold text-gray-900 text-sm">More</p>
          <button onClick={() => setMoreOpen(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Close">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-3 py-3">
          {OWNER_NAV.filter(function(item) { return MOBILE_PRIMARY.indexOf(item.href) === -1; }).map(function(item) {
            var active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={"flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-150 " +
                  (active ? "bg-purple-50 text-purple-600" : "text-gray-600 hover:bg-gray-50")}
              >
                <Icon name={item.icon} active={active} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-2 mt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={goSwitchToBranch}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Icon name="switch" />
              <span>Switch to Branch Dashboard</span>
            </button>
          </div>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </>
  );
}
