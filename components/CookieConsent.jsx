import { useState, useEffect } from 'react';
import { loadGoogleAnalytics } from '../lib/analytics';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    var choice = localStorage.getItem('rb_cookie_consent');
    if (choice === 'accepted') {
      loadGoogleAnalytics();
    } else if (!choice) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem('rb_cookie_consent', 'accepted');
    setVisible(false);
    loadGoogleAnalytics();
  }

  function decline() {
    localStorage.setItem('rb_cookie_consent', 'declined');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-200 shadow-lg px-4 py-4 sm:px-6">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
        <p className="text-sm text-gray-600 flex-1 text-center sm:text-left">
          We use cookies to understand how you use ReviewBooster and to improve your experience.
          See our <a href="/privacy" className="text-purple-600 underline">Privacy Policy</a> for details.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
