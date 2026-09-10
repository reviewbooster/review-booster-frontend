/**
 * pages/dashboard/billing.jsx
 * Billing now lives inside Settings. This route stays so old
 * bookmarks/links don't 404 — it just redirects.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function BillingRedirect() {
  const router = useRouter();
  useEffect(function() { router.replace('/dashboard/settings'); }, [router]);
  return null;
}
