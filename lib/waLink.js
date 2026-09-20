/**
 * lib/waLink.js
 * A wa.me link opened with target="_blank" fails silently on iOS when the
 * app is running as an installed PWA (standalone mode) -- there's no "new
 * tab" concept there, so the OS never gets the chance to hand off to the
 * WhatsApp app. The fix is to navigate the current window instead, but
 * only in standalone mode -- everywhere else (desktop, mobile browser tab)
 * target="_blank" behaves correctly and switching it off there would just
 * navigate the whole app away from itself.
 */

export function isStandalonePWA() {
  if (typeof window === 'undefined') return false;
  return window.navigator.standalone === true ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches);
}

// Props to spread onto a WhatsApp <a> tag so it opens correctly on every
// platform: <a href={waUrl} {...waLinkProps()}>...</a>
export function waLinkProps() {
  if (isStandalonePWA()) {
    return {};
  }
  return { target: '_blank', rel: 'noopener noreferrer' };
}
