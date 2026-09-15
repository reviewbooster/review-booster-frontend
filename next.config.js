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
};

module.exports = withPWA(nextConfig);
