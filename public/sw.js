/* ===== PWA + FIREBASE PUSH : MERGED SERVICE WORKER ===== */

// -------- Firebase (Push Notifications) --------
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCmAzjIpbPy1ENyiLoURLWg2cI7fBWcUa4",
  authDomain: "warrior-aaradhya.firebaseapp.com",
  projectId: "warrior-aaradhya",
  messagingSenderId: "105939562180",
  appId: "1:105939562180:web:6eb2d862a01902a98fe391"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  self.registration.showNotification(
    payload.notification.title,
    {
      body: payload.notification.body,

      // 🔔 Notification icon
      icon: '/favicon.png',

      // 🔴 Android badge (small icon)
      badge: '/favicon-96x96.png',

      data: {
        url: '/'
      }
    }
  );
});



// -------- PWA Offline Cache --------
const CACHE_NAME = 'warrior-aaradhya-v2';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([
        '/',
        '/index.html',
        '/style.css',
        OFFLINE_URL,
        '/web-app-manifest-192x192.png'
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response =>
      response || fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
    )
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow('/');
      })
  );
});
