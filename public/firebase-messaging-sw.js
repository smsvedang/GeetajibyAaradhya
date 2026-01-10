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
  self.registration.showNotification(
    payload.notification.title,
    { body: payload.notification.body }
  );
});
