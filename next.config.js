/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // API base URL exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  },
};

module.exports = nextConfig;
