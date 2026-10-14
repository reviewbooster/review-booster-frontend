/**
 * components/OverviewNavShell.jsx
 * Custom nav for the All Locations Overview page only -- NOT the normal
 * ReviewBooster Sidebar. Desktop: a sidebar with just these items. Mobile:
 * a bottom bar with the same items. Tapping an item swaps the content area
 * in place (local state, same URL, no page navigation/redirect) rather
 * than routing to a separate page.
 *
 * "overviewContent" is the Overview tab's JSX, passed in by the page
 * itself (it needs the page's own data/state). The other three tabs embed
 * the real feature pages' content components directly, so adding a
 * location / inviting a manager / viewing reviews / exporting a report
 * here is the exact same UI as the standalone pages -- just without
 * leaving this screen.
 */

import { useState } from 'react';
import { LocationsContent } from '../pages/dashboard/settings/locations';
import { TeamContent } from '../pages/dashboard/team';
import { ReviewsHubContent } from '../pages/dashboard/reviews-hub';
import { AnalyticsContent } from '../pages/dashboard/analytics';

var TABS = [
  { key: 'overview',  label: 'Overview',          shortLabel: 'Overview', icon: '📊' }, // 📊
  { key: 'locations', label: 'Add Location',      shortLabel: 'Locations', icon: '➕' },        // ➕
  { key: 'team',      label: 'Invite Manager',    shortLabel: 'Team',      icon: '👤' },  // 👤
  { key: 'reviews',   label: 'View All Reviews',  shortLabel: 'Reviews',   icon: '⭐' },         // ⭐
  { key: 'analytics', label: 'Export Report',     shortLabel: 'Export',    icon: '📤' },  // 📤
];

export default function OverviewNavShell({ overviewContent }) {
  const [activeTab, setActiveTab] = useState('overview');

  function renderContent() {
    switch (activeTab) {
      case 'locations': return <LocationsContent />;
      case 'team':      return <TeamContent />;
      case 'reviews':   return <ReviewsHubContent />;
      case 'analytics': return <AnalyticsContent />;
      default:          return overviewContent;
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Desktop sidebar -- sticky within the page's own content column, not
          fixed to the viewport, so it stays inside the normal page flow. */}
      <aside
        className="hidden md:flex md:flex-col md:w-44 shrink-0 gap-1 sticky self-start"
        style={{ top: 'calc(1.25rem + env(safe-area-inset-top, 0px))' }}
      >
        {TABS.map(function(tab) {
          var active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={function() { setActiveTab(tab.key); }}
              className={'flex items-center gap-2.5 text-left px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ' +
                (active ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700')}
            >
              <span className="text-base shrink-0">{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </aside>

      {/* Content area */}
      <div className="flex-1 min-w-0 pb-20 md:pb-0">
        {renderContent()}
      </div>

      {/* Mobile bottom bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {TABS.map(function(tab) {
          var active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={function() { setActiveTab(tab.key); }}
              className={'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ' +
                (active ? 'text-purple-600' : 'text-gray-400')}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span className="truncate max-w-full px-0.5">{tab.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
