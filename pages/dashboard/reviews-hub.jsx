/**
 * pages/dashboard/reviews-hub.jsx
 * Reviews hub -- landing page for the Reviews section of the nav.
 * Cards out to QR Code, Reviews, and Feedback. (Customers moved to its own
 * top-level nav item.)
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../components/DashboardLayout';
import withAuth from '../../components/withAuth';
import InfoButton from '../../components/InfoButton';
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
      <div className="mb-5 flex items-start gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Reviews</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">Everything about collecting and managing reviews.</p>
        </div>
        <InfoButton title="Reviews" autoShowKey="reviews">
          <p className="font-medium text-gray-700">Where you collect feedback and guide happy customers toward a public Google review.</p>
          <ul className="mt-3 space-y-2 list-disc list-inside">
            <li><span className="font-semibold text-gray-700">QR code</span> {'\u2014'} how customers get here</li>
            <li><span className="font-semibold text-gray-700">Google Reviews</span> {'\u2014'} what they've posted publicly</li>
            <li><span className="font-semibold text-gray-700">Feedback</span> {'\u2014'} private complaints that need your attention first</li>
          </ul>
        </InfoButton>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <HubCard
          href="/dashboard/qr"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1" stroke="#7C3AED" strokeWidth="1.8" />
              <rect x="14" y="3" width="7" height="7" rx="1" stroke="#7C3AED" strokeWidth="1.8" />
              <rect x="3" y="14" width="7" height="7" rx="1" stroke="#7C3AED" strokeWidth="1.8" />
              <rect x="15" y="15" width="2.5" height="2.5" fill="#7C3AED" />
              <rect x="18.5" y="15" width="2.5" height="2.5" fill="#7C3AED" />
              <rect x="15" y="18.5" width="2.5" height="2.5" fill="#7C3AED" />
            </svg>
          }
          title="QR Code"
          description="Show or share your review QR code"
        />
        <HubCard
          href="/dashboard/reviews"
          icon={
            <svg width="20" height="20" fill="none" stroke="#7C3AED" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          }
          title="Google Reviews"
          description="See the reviews you've received"
        />
        <HubCard
          href="/dashboard/feedback"
          icon={
            <svg width="20" height="20" fill="none" stroke="#7C3AED" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <path d="M4 22v-7" strokeLinecap="round" />
            </svg>
          }
          title="Feedback"
          description="Private feedback from unhappy customers"
          badge={unresolvedCount}
        />
      </div>
    </DashboardLayout>
  );
}

export default withAuth(ReviewsHubPage);