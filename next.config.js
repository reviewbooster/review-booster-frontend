/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development', // service worker only in production builds
  register: true,
  skipWaiting: true,
  buildExcludes: [/dynamic-css-manifest\.json$/, /middleware-manifest\.json$/, /app-build-manifest\.json$/],
});

const nextConfig = {
  reactStrictMode: true,
  // API base URL exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  },
  // Proxies /api/* through this same domain to the real backend, so the
  // login/refresh cookie is set as first-party rather than third-party.
  // iOS (especially inside an installed PWA) blocks third-party cookies
  // aggressively, which is what was breaking "stay logged in" on iPhone --
  // this makes the cookie look like it belongs to this domain instead of
  // a separate one. Only active in production; local dev talks to
  // localhost:5000 directly, same as always.
  async rewrites() {
    if (process.env.NODE_ENV !== 'production') return [];
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL + '/:path*',
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
