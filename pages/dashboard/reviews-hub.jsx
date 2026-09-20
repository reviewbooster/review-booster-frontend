/**
 * pages/dashboard/reviews-hub.jsx
 * Reviews hub -- landing page for the Reviews section of the nav.
 * Cards out to Customers, QR Code, Reviews, and Feedback.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';
import api from '../../lib/api';

function HubCard({ href, icon, title, description, badge }) {
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:border-purple-200 hover:shadow-md transition-all"
    >
      <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 text-xl">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-gray-900">{title}</p>
          {badge > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <span className="text-gray-300 text-lg shrink-0">{'\u2192'}</span>
    </Link>
  );
}

function ReviewsHubPage() {
  const [unresolvedCount, setUnresolvedCount] = useState(0);

  useEffect(() => {
    api.get('/reviews/private?page=1&limit=1')
      .then((res) => setUnresolvedCount(res.data?.totalUnresolved ?? 0))
      .catch(() => { /* silent */ });
  }, []);

  return (
    <DashboardLayout>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900 leading-tight">Reviews</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Everything about collecting and managing reviews.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <HubCard
          href="/dashboard/customers"
          icon={'\uD83D\uDC65'}
          title="Customers"
          description="Manage customers and send review requests"
        />
        <HubCard
          href="/dashboard/qr"
          icon={'\u25A3'}
          title="QR Code"
          description="Show or share your review QR code"
        />
        <HubCard
          href="/dashboard/reviews"
          icon={'\u2605'}
          title="Google Reviews"
          description="See the reviews you've received"
        />
        <HubCard
          href="/dashboard/feedback"
          icon={'\u2691'}
          title="Feedback"
          description="Private feedback from unhappy customers"
          badge={unresolvedCount}
        />
      </div>
    </DashboardLayout>
  );
}

export default withAuth(ReviewsHubPage);