/**
 * pages/owner/index.jsx
 * Bare /owner always lands on Overview (spec section 3: "The owner opens
 * the Owner Dashboard, normally landing on Overview").
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import withAuth from '../../components/withAuth';

function OwnerIndexPage() {
  const router = useRouter();
  useEffect(function() {
    router.replace('/owner/overview');
  }, [router]);
  return null;
}

export default withAuth(OwnerIndexPage, { requiredRole: 'owner' });
