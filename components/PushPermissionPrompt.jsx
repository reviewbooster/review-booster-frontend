import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

function urlBase64ToUint8Array(base64String) {
  var padding = '='.repeat((4 - base64String.length % 4) % 4);
  var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  var rawData = window.atob(base64);
  var outputArray = new Uint8Array(rawData.length);
  for (var i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushPermissionPrompt() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(function() {
    if (!user) return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission === 'granted' || Notification.permission === 'denied') return;
    if (localStorage.getItem('rb_push_dismissed') === '1') return;

    navigator.serviceWorker.register('/sw.js').catch(function() {});
    setVisible(true);
  }, [user]);

  const enable = async function() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setVisible(false); return; }

      const reg = await navigator.serviceWorker.ready;
      const res = await api.get('/notifications/vapid-public-key');
      const key = res.data && res.data.key;
      if (!key) { setVisible(false); return; }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });

      await api.post('/notifications/subscribe', sub.toJSON());
    } catch (err) {
      // best-effort; silently fail
    } finally {
      setVisible(false);
    }
  };

  const dismiss = function() {
    localStorage.setItem('rb_push_dismissed', '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 z-[70] bg-white rounded-2xl shadow-xl border border-purple-100 px-4 py-3.5 flex items-center gap-3 md:max-w-sm animate-slide-up">
      <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 text-purple-600 text-lg">
        {'\uD83D\uDD14'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">Turn on notifications?</p>
        <p className="text-xs text-gray-400 mt-0.5">Get notified the moment a new review or feedback comes in.</p>
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">
        <button onClick={enable} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors">
          Enable
        </button>
        <button onClick={dismiss} className="text-xs font-semibold px-3 py-1 text-gray-400 hover:text-gray-600 transition-colors">
          Not now
        </button>
      </div>
    </div>
  );
}
