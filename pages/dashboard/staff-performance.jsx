/**
 * pages/dashboard/staff-performance.jsx
 * Staff Performance is now merged into the Team page. This route stays
 * so any old bookmarks/links don't 404 — it just redirects.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function StaffPerformanceRedirect() {
  const router = useRouter();
  useEffect(function() { router.replace('/dashboard/team'); }, [router]);
  return null;
}
