import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import ChangePasswordModal from "./ChangePasswordModal";
import api from "../lib/api";
import NotificationDropdown from "./NotificationDropdown";

// Flat top-level nav -- each item is a hub/landing page. matchPrefixes lists
// every child route that should still show this item as "active" once you've
// drilled into a card from the hub (e.g. /dashboard/customers stays under Reviews).
const OWNER_NAV_TOP = [
  {
    href: "/dashboard",
    icon: "\u25C8",
    label: "Home",
    matchPrefixes: ["/dashboard"],
    exact: true,
  },
  {
    href: "/dashboard/reviews-hub",
    icon: "\u2605",
    label: "Reviews",
    badge: true,
    matchPrefixes: [
      "/dashboard/reviews-hub",
      "/dashboard/customers",
      "/dashboard/qr",
      "/dashboard/reviews",
      "/dashboard/feedback",
      "/dashboard/send-request",
    ],
  },
  {
    href: "/dashboard/growth-hub",
    icon: "\uD83D\uDCC8",
    label: "Growth",
    matchPrefixes: [
      "/dashboard/growth-hub",
      "/dashboard/referrals",
      "/dashboard/refer-a-business",
      "/dashboard/win-back",
      "/dashboard/analytics",
    ],
  },
  {
    href: "/dashboard/settings-hub",
    icon: "\u2699",
    label: "Settings",
    matchPrefixes: ["/dashboard/settings-hub", "/dashboard/team", "/dashboard/settings"],
  },
];

const ADMIN_NAV = [
  { href: "/dashboard/admin/dashboard",    icon: "\uD83D\uDCCA", label: "Dashboard",    mobileLabel: "Dashboard", activeClass: "bg-purple-50 text-purple-600" },
  { href: "/dashboard/admin",              icon: "\uD83C\uDFE2", label: "Businesses",   mobileLabel: "Businesses", activeClass: "bg-blue-50 text-blue-600" },
  { href: "/dashboard/admin/approvals",    icon: "\u2713",        label: "Approvals",    mobileLabel: "Approvals", activeClass: "bg-green-50 text-green-600",  pendingBadge: true },
  { href: "/dashboard/requests",           icon: "\uD83D\uDD13", label: "Requests",     mobileLabel: "Requests",  activeClass: "bg-amber-50 text-amber-600", count: true },
];

// Grouped -- used for the desktop sidebar, matching the Super Admin doc's
// section headers (Overview / Business / Growth / Operations / System).
const ADMIN_NAV_GROUPS = [
  { header: "Overview", items: [
    { href: "/dashboard/admin/dashboard", icon: "\uD83D\uDCCA", label: "Dashboard" },
  ]},
  { header: "Business", items: [
    { href: "/dashboard/admin", icon: "\uD83C\uDFE2", label: "Businesses" },
    { href: "/dashboard/admin/plans", icon: "\uD83D\uDCB3", label: "Plans" },
    { href: "/dashboard/admin?modal=billing", icon: "\uD83D\uDCB0", label: "Billing Settings" },
  ]},
  { header: "Growth", items: [
    { href: "/dashboard/admin/qr-templates", icon: "\uD83C\uDFA8", label: "QR Templates" },
    { href: "/dashboard/admin?modal=referrals", icon: "\uD83C\uDF1F", label: "Business Referrals" },
  ]},
  { header: "Operations", items: [
    { href: "/dashboard/admin/approvals", icon: "\u2713", label: "Approvals" },
    { href: "/dashboard/requests", icon: "\uD83D\uDD13", label: "Requests" },
  ]},
  { header: "System", items: [
    { href: "/dashboard/admin/audit-log", icon: "\uD83D\uDCCB", label: "Audit Log" },
    { href: "/dashboard/admin/support-chats", icon: "\uD83D\uDCAC", label: "Support Chats" },
  ]},
];

function HomeIcon({ active }) {
  var sw = active ? "2.5" : "1.8";
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <path
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsersIcon({ active }) {
  var sw = active ? "2.5" : "1.8";
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <path
        d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth={sw} />
      <path
        d="M23 21v-2a4 4 0 00-3-3.87"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 3.13a4 4 0 010 7.75"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function QRCodeIcon({ active }) {
  var sw = active ? "2" : "1.6";
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth={sw} />
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth={sw} />
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth={sw} />
      <path d="M14 14h2v2h-2zM17 14h2v2h-2zM14 17h2v2h-2zM17 17h2v2h-2z" fill="currentColor" />
    </svg>
  );
}

function StarNavIcon({ active }) {
  var sw = active ? "2" : "1.8";
  return (
    <svg width="22" height="22" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24">
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FlagNavIcon({ active }) {
  var sw = active ? "2.5" : "1.8";
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 22v-7" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
      <path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.73 21a2 2 0 01-3.46 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function GrowthIcon({ active }) {
  var sw = active ? "2.5" : "1.8";
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <path
        d="M3 17l6-6 4 4 8-8"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15 7h6v6" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsGearIcon({ active }) {
  var sw = active ? "2.2" : "1.8";
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={sw} />
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Icons for the flat top-level nav -- desktop uses the emoji/text icons in
// OWNER_NAV_TOP directly; mobile top bar + bottom bar use these SVG versions.
const TOP_NAV_ICONS = {
  "/dashboard":               HomeIcon,
  "/dashboard/reviews-hub":   StarNavIcon,
  "/dashboard/growth-hub":    GrowthIcon,
  "/dashboard/settings-hub":  SettingsGearIcon,
};

export default function Sidebar({ unresolvedCount = 0, resetRequestCount = 0 }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [dropdownOpen,       setDropdownOpen]       = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [drawerOpen,         setDrawerOpen]         = useState(false);
  const desktopRef = useRef(null);
  const mobileRef  = useRef(null);

  useEffect(function() { setDrawerOpen(false); }, [router.pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        !desktopRef.current?.contains(e.target) &&
        !mobileRef.current?.contains(e.target)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount,       setUnreadCount]       = useState(0);
  const [notifToast,        setNotifToast]        = useState(false);
  const [pendingCount,      setPendingCount]      = useState(0);
  const prevUnreadRef   = useRef(null);
  const toastTimeoutRef = useRef(null);

  useEffect(function() {
    if (!user) return;
    var fetchCount = async function() {
      try {
        var res   = await api.get("/notifications/unread-count");
        var count = res.data.count || 0;
        if (prevUnreadRef.current !== null && count > prevUnreadRef.current) {
          if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
          setNotifToast(true);
          toastTimeoutRef.current = setTimeout(function() { setNotifToast(false); }, 3000);
        }
        prevUnreadRef.current = count;
        setUnreadCount(count);
      } catch (e) { /* silent */ }
    };
    fetchCount();
    var timer = setInterval(fetchCount, 60000);
    return function() {
      clearInterval(timer);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [user]);

  useEffect(function() {
    if (!user || user.role !== 'super_admin') return;
    var fetchPending = async function() {
      try {
        var res = await api.get('/admin/pending-count');
        setPendingCount(res.data.count || 0);
      } catch (e) { /* silent */ }
    };
    fetchPending();
    var timer = setInterval(fetchPending, 60000);
    return function() { clearInterval(timer); };
  }, [user]);

  function toggleNotifications() {
    setShowNotifications(function(o) { return !o; });
  }

  function isActive(href) {
    return href === "/dashboard"
      ? router.pathname === "/dashboard"
      : router.pathname.startsWith(href);
  }

  function isAdminActive(href) {
    return router.pathname === href;
  }

  function roleChip(role) {
    if (role === "super_admin") return "bg-purple-100 text-purple-600";
    if (role === "owner")       return "bg-purple-100 text-purple-600";
    return "bg-gray-100 text-gray-500";
  }

  // A top-level item (e.g. "Reviews") stays highlighted for its whole family
  // of child pages, not just the hub page itself -- so it's still obvious
  // which section you're in once you've drilled into a card.
  function isTopNavActive(item) {
    if (item.exact) return router.pathname === item.href;
    return item.matchPrefixes.some(function(p) {
      return router.pathname === p || router.pathname.startsWith(p + "/");
    });
  }

  function renderOwnerTop(onItemClick, itemPaddingClass) {
    return (
      <>
        {OWNER_NAV_TOP.map(function(item) {
          var active = isTopNavActive(item);
          var Icon = TOP_NAV_ICONS[item.href];
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className={"flex items-center gap-3 px-3 " + itemPaddingClass + " rounded-lg text-sm font-medium transition-all duration-150 " +
                (active ? "bg-purple-50 text-purple-600" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50")}
            >
              <Icon active={active} />
              <span>{item.label}</span>
              {item.badge && unresolvedCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                  {unresolvedCount > 99 ? "99+" : unresolvedCount}
                </span>
              )}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <>
      {/* -------- DESKTOP SIDEBAR -------- */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 bg-white border-r border-gray-100 flex-col z-30">

        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/logo-lockup.png" alt="ReviewBooster" className="h-7 w-auto" />
            </div>
            <button
              onClick={toggleNotifications}
              className={"relative p-1 rounded-lg transition-colors " + (showNotifications ? "text-purple-600 bg-purple-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50")}
              aria-label="Notifications"
            >
              <BellIcon />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
          </div>
        </div>

        {user && (
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-0.5">Business</p>
            <p className="text-gray-700 text-sm font-medium truncate">{user.name}</p>
            <span className={"mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold " + roleChip(user.role)}>
              {user.role}
            </span>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {user?.role === "super_admin" ? (
            ADMIN_NAV_GROUPS.map(function(group) {
              return (
                <div key={group.header} className="mb-3 last:mb-0">
                  <p className="px-3 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{group.header}</p>
                  {group.items.map(function({ href, icon, label, count, pendingBadge }) {
                    var active    = isAdminActive(href);
                    var itemCount = count ? resetRequestCount : (pendingBadge ? pendingCount : 0);
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={"flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative " +
                          (active ? "bg-purple-50 text-purple-600" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50")}
                      >
                        <span className="text-base">{icon}</span>
                        <span>{label}</span>
                        {itemCount > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                            {itemCount > 99 ? "99+" : itemCount}
                          </span>
                                                )}
                      </Link>
                    );
                  })}
                </div>
              );
            })
          ) : (
            renderOwnerTop(undefined, "py-2.5")
          )}
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
              <svg
                className={"w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150 " + (dropdownOpen ? "rotate-180" : "")}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-50">
                <button
                  onClick={() => { setDropdownOpen(false); setChangePasswordOpen(true); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <span>{"\uD83D\uDD12"}</span>
                  Change Password
                </button>
                <div className="h-px bg-gray-100" />
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <span>{"\u238B"}</span>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* -------- MOBILE TOP BAR -------- */}
      <div className="flex md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-100 z-30 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={function() { setDrawerOpen(true); }}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Menu"
          >
            <HamburgerIcon />
          </button>
          <img src="/logo-lockup.png" alt="ReviewBooster" className="h-6 w-auto" />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleNotifications}
            className="relative text-gray-500 hover:text-gray-700 transition-colors w-9 h-9 flex items-center justify-center"
            aria-label="Notifications"
          >
            <BellIcon />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>

          <div className="relative" ref={mobileRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold active:scale-95 transition-transform"
              style={{ backgroundColor: "#7C3AED" }}
            >
              {user?.name?.[0]?.toUpperCase() || "U"}
            </button>
            {dropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-52 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-gray-900 text-sm font-semibold truncate">{user?.name}</p>
                  <p className="text-gray-400 text-xs capitalize mt-0.5">{user?.role}</p>
                </div>
                <button
                  onClick={() => { setDropdownOpen(false); setChangePasswordOpen(true); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <span>{"\uD83D\uDD12"}</span>
                  Change Password
                </button>
                <div className="h-px bg-gray-100" />
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <span>{"\u238B"}</span>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* -------- MOBILE BOTTOM NAV -------- */}
      <nav
        className="flex md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {user?.role === "super_admin" ? (
          <div className="flex justify-around w-full py-1">
            {ADMIN_NAV.map(function({ href, icon, mobileLabel, count, pendingBadge }) {
              var active    = isAdminActive(href);
              var itemCount = count ? resetRequestCount : (pendingBadge ? pendingCount : 0);
              return (
                <Link
                  key={href}
                  href={href}
                  className={"relative flex flex-col items-center justify-center px-4 py-2 gap-0.5 rounded-lg transition-colors " +
                    (active ? "text-purple-600" : "text-gray-400")}
                >
                  <span className="text-xl leading-none">{icon}</span>
                  <span className="text-[10px] font-medium">{mobileLabel}</span>
                  {itemCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {itemCount > 9 ? "9+" : itemCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="relative flex w-full py-1 items-center">
            {OWNER_NAV_TOP.slice(0, 2).map(function(item) {
              var active = isTopNavActive(item);
              var count  = item.badge ? unresolvedCount : 0;
              var Icon   = TOP_NAV_ICONS[item.href];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={"relative flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors " +
                    (active ? "text-purple-600" : "text-gray-400")}
                >
                  <Icon active={active} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                  {count > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Raised center action -- the one time-sensitive task (sending a
                review request in front of a customer), always one tap away
                from anywhere in the app, distinct from ordinary navigation. */}
            <div className="flex-1 flex justify-center">
              <Link
                href="/dashboard/send-request"
                className="flex flex-col items-center justify-center -mt-7 w-14 h-14 rounded-full bg-purple-600 text-white shadow-lg shadow-purple-300/50 active:scale-95 transition-transform"
                aria-label="Send Review Request"
              >
                <span className="text-2xl leading-none font-light">{'+'}</span>
              </Link>
            </div>

            {OWNER_NAV_TOP.slice(2, 4).map(function(item) {
              var active = isTopNavActive(item);
              var Icon   = TOP_NAV_ICONS[item.href];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={"relative flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors " +
                    (active ? "text-purple-600" : "text-gray-400")}
                >
                  <Icon active={active} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* -------- MOBILE DRAWER -------- */}
      <div
        className={"fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-300 " + (drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}
        onClick={function() { setDrawerOpen(false); }}
      />
      <div
        className={"fixed inset-y-0 left-0 w-72 bg-white z-50 md:hidden flex flex-col shadow-2xl transition-transform duration-300 " + (drawerOpen ? "translate-x-0" : "-translate-x-full")}
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <img src="/logo-lockup.png" alt="ReviewBooster" className="h-6 w-auto" />
          </div>
          <button
            onClick={function() { setDrawerOpen(false); }}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {user?.role === "super_admin" ? (
            ADMIN_NAV_GROUPS.map(function(group) {
              return (
                <div key={group.header} className="mb-3 last:mb-0">
                  <p className="px-3 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{group.header}</p>
                  {group.items.map(function({ href, icon, label, count, pendingBadge }) {
                    var active    = isAdminActive(href);
                    var itemCount = count ? resetRequestCount : (pendingBadge ? pendingCount : 0);
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={function() { setDrawerOpen(false); }}
                        className={"flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-150 " +
                          (active ? "bg-purple-50 text-purple-600" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50")}
                      >
                        <span className="text-base">{icon}</span>
                        <span>{label}</span>
                        {itemCount > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                            {itemCount > 99 ? "99+" : itemCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            })
          ) : (
            renderOwnerTop(function() { setDrawerOpen(false); }, "py-3")
          )}
        </nav>
      </div>

      {notifToast && !showNotifications && (
        <div className="fixed top-20 md:top-5 right-4 z-[60] bg-white rounded-2xl shadow-xl border border-purple-100 px-4 py-3 flex items-center gap-3 max-w-xs animate-slide-up">
          <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 text-purple-600">
            <BellIcon />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">New notification</p>
            <p className="text-xs text-gray-400 mt-0.5">Tap the bell to view</p>
          </div>
        </div>
      )}
      {showNotifications && (
        <NotificationDropdown
          onClose={function() { setShowNotifications(false); }}
          onUnreadChange={function(n) { setUnreadCount(n); }}
        />
      )}
      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </>
  );
}