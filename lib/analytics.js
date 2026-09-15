// lib/analytics.js
// GA4 loader -- only called after the user accepts the cookie banner.
export const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // TODO: replace with your real GA4 Measurement ID

export function loadGoogleAnalytics() {
  if (typeof window === 'undefined') return;
  if (window.__rbGaLoaded) return;
  window.__rbGaLoaded = true;

  var script1 = document.createElement('script');
  script1.async = true;
  script1.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
  document.head.appendChild(script1);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
}

export function trackPageview(url) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('config', GA_MEASUREMENT_ID, { page_path: url });
}
