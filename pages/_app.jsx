import { useEffect } from 'react';
import '../styles/globals.css';
import { AuthProvider } from '../context/AuthContext';

/**
 * GlobalModalScrollLock
 * Every modal/popup in the app uses the same "fixed inset-0" overlay pattern.
 * This watches the DOM for any such overlay that is actually visible
 * (not display:none, not opacity:0, not pointer-events:none — which is how
 * hidden-but-mounted overlays like the mobile sidebar backdrop signal
 * "closed") and locks background scroll while it's open.
 *
 * The check is debounced — a MutationObserver on a React app fires very
 * often (every class/state change anywhere), and each check does a
 * document-wide query plus getComputedStyle (which forces a layout read).
 * Running that synchronously on every mutation caused noticeable slowdown
 * across the app, so bursts of mutations are coalesced into a single
 * check ~60ms after they settle.
 */
function isOverlayActive() {
  if (typeof document === 'undefined') return false;
  var els = document.querySelectorAll('.fixed.inset-0');
  for (var i = 0; i < els.length; i++) {
    var style = window.getComputedStyle(els[i]);
    if (style.display !== 'none' && style.opacity !== '0' && style.pointerEvents !== 'none') {
      return true;
    }
  }
  return false;
}

function GlobalModalScrollLock() {
  useEffect(function() {
    var timeoutId = null;

    function sync() {
      document.body.style.overflow = isOverlayActive() ? 'hidden' : '';
    }

    function scheduleSync() {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(sync, 60);
    }

    sync();
    var observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    return function() {
      if (timeoutId) clearTimeout(timeoutId);
      observer.disconnect();
      document.body.style.overflow = '';
    };
  }, []);
  return null;
}

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <GlobalModalScrollLock />
      <Component {...pageProps} />
    </AuthProvider>
  );
}