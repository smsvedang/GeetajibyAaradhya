importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCmAzjIpbPy1ENyiLoURLWg2cI7fBWcUa4",
  authDomain: "warrior-aaradhya.firebaseapp.com",
  projectId: "warrior-aaradhya",
  storageBucket: "warrior-aaradhya.firebasestorage.app",
  messagingSenderId: "105939562180",
  appId: "1:105939562180:web:6eb2d862a01902a98fe391",
  measurementId: "G-Y4KCBXN8Y4"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const targetUrl = (payload && payload.data && payload.data.url)
    || (payload && payload.fcmOptions && payload.fcmOptions.link)
    || (payload && payload.notification && payload.notification.click_action)
    || '/';

  self.registration.showNotification(
    payload.notification.title,
    {
      body: payload.notification.body,
      data: { url: targetUrl }
    }
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const rawUrl = (event.notification && event.notification.data && event.notification.data.url) || '/';
  let targetUrl = rawUrl;
  try {
    targetUrl = new URL(rawUrl, self.location.origin).href;
  } catch (e) {
    targetUrl = self.location.origin + '/';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if ((client.url === targetUrl || client.url === rawUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      })
  );
});
