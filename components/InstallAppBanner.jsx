import { useState, useEffect } from 'react';

/**
 * components/InstallAppBanner.jsx
 * A dismissible banner prompting business owners/staff to install the
 * dashboard to their phone's home screen. Android/Chrome gets a real
 * "Install" button via the browser's beforeinstallprompt event; iOS
 * Safari never fires that event, so it gets instructions instead.
 * Hidden entirely once already installed (standalone display mode) or
 * after the user dismisses it once (remembered in localStorage).
 */
export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(function() {
    var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) return;

    if (localStorage.getItem('rb_install_dismissed') === '1') return;

    var ua = window.navigator.userAgent;
    var iosDevice = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    setIsIOS(iosDevice);

    if (iosDevice) {
      setShowBanner(true);
      return;
    }

    var handler = function(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return function() { window.removeEventListener('beforeinstallprompt', handler); };
  }, []);

  var handleInstall = async function() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  var handleDismiss = function() {
    localStorage.setItem('rb_install_dismissed', '1');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xl shrink-0">{'\uD83D\uDCF1'}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">Install ReviewBooster</p>
          {isIOS ? (
            <p className="text-xs text-gray-500">{'Tap the Share icon, then "Add to Home Screen" for quick access.'}</p>
          ) : (
            <p className="text-xs text-gray-500">Add it to your home screen for quick, full-screen access.</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!isIOS && (
          <button onClick={handleInstall} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
            Install
          </button>
        )}
        <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1" aria-label="Dismiss">
          {'\u00D7'}
        </button>
      </div>
    </div>
  );
}