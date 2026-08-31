/**
 * pages/qr/[qr_token].jsx
 *
 * PUBLIC — no auth required.
 * Customer scans QR code → lands here → we create a ReviewRequest on the fly
 * → redirect to the existing /r/[token] review flow.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import api from '../../lib/api';

export default function QrRedirect() {
  const router = useRouter();
  const { qr_token } = router.query;
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!qr_token) return;
    api.get('/r/qr/' + qr_token)
      .then(function(res) {
        router.replace('/r/' + res.data.data.token);
      })
      .catch(function() {
        setError('This QR code is invalid or has been deactivated. Please ask the business for help.');
      });
  }, [qr_token]);

  return (
    <>
      <Head>
        <title>ReviewBooster</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-5">
        {!error ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-400">Loading your review page...</p>
          </div>
        ) : (
          <div className="text-center max-w-sm">
            <p className="text-5xl mb-4">{"\uD83D\uDD17"}</p>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid QR Code</h1>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>
        )}
      </div>
    </>
  );
}