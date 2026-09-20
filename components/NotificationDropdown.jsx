import { useState, useEffect } from 'react';
import api from '../lib/api';

function timeAgo(dateStr) {
  var diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return Math.floor(diff / 60)   + 'm ago';
  if (diff < 86400)  return Math.floor(diff / 3600)  + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

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

function FeedbackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
      />
    </svg>
  );
}

function ReviewIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

// -- Push notification permission/subscription state, checked on mount --
function usePushState() {
  var [supported,  setSupported]  = useState(false);
  var [permission, setPermission] = useState('default');
  var [subscribed, setSubscribed] = useState(false);
  var [checking,   setChecking]   = useState(true);

  var refresh = async function() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false);
      setChecking(false);
      return;
    }
    setSupported(true);
    setPermission(Notification.permission);
    try {
      var reg = await navigator.serviceWorker.getRegistration();
      var sub = reg ? await reg.pushManager.getSubscription() : null;
      setSubscribed(!!sub);
    } catch (e) {
      setSubscribed(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(function() { refresh(); }, []);

  return { supported, permission, subscribed, checking, refresh: refresh, setSubscribed: setSubscribed, setPermission: setPermission };
}

export default function NotificationDropdown({ onClose, onUnreadChange }) {
  var [notifications, setNotifications] = useState([]);
  var [loading,       setLoading]       = useState(true);
  var push = usePushState();
  var [pushBusy, setPushBusy] = useState(false);

  var fetchAll = async function() {
    try {
      var res  = await api.get('/notifications');
      var list = res.data.notifications || [];
      setNotifications(list);
      onUnreadChange(list.filter(function(n) { return !n.is_read; }).length);
    } catch (e) {
      console.error('NotificationDropdown fetch failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(function() { fetchAll(); }, []);

  var markAll = async function() {
    try {
      await api.put('/notifications/read-all');
      setNotifications(function(prev) {
        return prev.map(function(n) { return Object.assign({}, n, { is_read: true }); });
      });
      onUnreadChange(0);
    } catch (e) {
      console.error('markAll failed', e);
    }
  };

  var markOne = async function(id) {
    try {
      await api.put('/notifications/' + id + '/read');
      var updated = notifications.map(function(n) {
        return n._id === id ? Object.assign({}, n, { is_read: true }) : n;
      });
      setNotifications(updated);
      onUnreadChange(updated.filter(function(n) { return !n.is_read; }).length);
    } catch (e) {
      console.error('markOne failed', e);
    }
  };

  var clearAll = async function() {
    try {
      await api.put('/notifications/read-all');
      setNotifications([]);
      onUnreadChange(0);
    } catch (e) {
      console.error('clearAll failed', e);
    }
  };

  var enablePush = async function() {
    setPushBusy(true);
    try {
      var permission = await Notification.requestPermission();
      push.setPermission(permission);
      if (permission !== 'granted') { return; }

      var reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      var res = await api.get('/notifications/vapid-public-key');
      var key = res.data && res.data.key;
      if (!key) return;

      var sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });

      await api.post('/notifications/subscribe', sub.toJSON());
      push.setSubscribed(true);
      localStorage.removeItem('rb_push_dismissed');
    } catch (e) {
      console.error('enablePush failed', e);
    } finally {
      setPushBusy(false);
    }
  };

  var disablePush = async function() {
    setPushBusy(true);
    try {
      var reg = await navigator.serviceWorker.getRegistration();
      var sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        var endpoint = sub.endpoint;
        await sub.unsubscribe();
        api.post('/notifications/unsubscribe', { endpoint: endpoint }).catch(function() {});
      }
      push.setSubscribed(false);
      localStorage.setItem('rb_push_dismissed', '1');
    } catch (e) {
      console.error('disablePush failed', e);
    } finally {
      setPushBusy(false);
    }
  };

  var unread = notifications.filter(function(n) { return !n.is_read; }).length;

  return (
    <>
      {/* Backdrop -- transparent, click anywhere outside panel to close */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel
          Mobile  : full-width strip below the h-14 top bar
          Desktop : 384px fixed card, top-right corner
      */}
      <div className="fixed top-14 left-0 right-0 md:top-4 md:left-auto md:right-4 md:w-96 z-50 bg-white md:rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">Notifications</span>
            {unread > 0 && (
              <span className="text-xs font-semibold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                {unread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unread > 0 && (
              <button
                onClick={markAll}
                className="text-xs text-purple-600 hover:text-purple-700 font-medium transition-colors"
              >
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto" style={{ maxHeight: '55vh' }}>

          {loading && (
            <div className="py-10 text-center text-gray-400 text-sm">Loading...</div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="py-12 text-center">
              <div className="text-3xl mb-2">{'🎉'}</div>
              <p className="text-sm font-medium text-gray-600">{"You're all caught up!"}</p>
              <p className="text-xs text-gray-400 mt-1">No notifications yet</p>
            </div>
          )}

          {!loading && notifications.map(function(n) {
            var isUnread   = !n.is_read;
            var isFeedback = n.type === 'new_feedback';

            var rowClass  = 'flex items-start gap-3 px-4 py-3 border-b border-gray-50 transition-colors ' +
              (isUnread ? 'bg-purple-50/40 cursor-pointer hover:bg-purple-50/70' : 'hover:bg-gray-50');

            var iconClass = 'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ' +
              (isFeedback ? 'bg-orange-50 text-orange-500' : 'bg-purple-50 text-purple-600');

            return (
              <div
                key={n._id}
                className={rowClass}
                onClick={function() { if (isUnread) { markOne(n._id); } }}
              >
                <div className={iconClass}>
                  {isFeedback ? <FeedbackIcon /> : <ReviewIcon />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className={'text-sm font-semibold leading-tight ' + (isUnread ? 'text-gray-900' : 'text-gray-600')}>
                      {n.title}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap mt-0.5">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.message}</p>
                </div>

                {isUnread && (
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
                )}
              </div>
            );
          })}

        </div>

        {/* Push notification toggle footer */}
        {push.supported && !push.checking && (
          <div className="border-t border-gray-100 px-4 py-3">
            {push.permission === 'denied' ? (
              <div className="flex items-center gap-2.5 text-xs text-gray-400">
                <BellIcon />
                <span>Notifications are blocked in your phone's settings for this app.</span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-sm text-gray-700">
                  <BellIcon />
                  <span>Push notifications</span>
                </div>
                {pushBusy ? (
                  <span className="spinner shrink-0" />
                ) : (
                  <button
                    type="button"
                    onClick={push.subscribed ? disablePush : enablePush}
                    className={'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 shrink-0 ' + (push.subscribed ? 'bg-purple-600' : 'bg-gray-300')}
                  >
                    <span className={'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ' + (push.subscribed ? 'translate-x-6' : 'translate-x-1')} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
