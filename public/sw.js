const CACHE_NAME = 'warrior-aaradhya-v1';
const OFFLINE_URL = 'offline.html';

// ऐप "install" होते ही ज़रूरी चीज़ें कैशे कर लो
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Cache खोला गया');
      // ये वो फ़ाइलें हैं जो ऑफलाइन भी चलनी चाहिए
      return cache.addAll([
        '/',
        '/index.html',
        '/style.css',
        '/offline.html',
        '/android-chrome-192x192.png' // आइकॉन भी कैशे कर लो
      ]);
    })
  );
  self.skipWaiting();
});

// कोई भी रिक्वेस्ट (fetch) आने पर
self.addEventListener('fetch', (event) => {
  event.respondWith(
    // पहले कैशे में ढूँढो
    caches.match(event.request).then((response) => {
      // 1. अगर कैशे में मिल गया, तो वही दिखा दो
      if (response) {
        return response;
      }

      // 2. अगर कैशे में नहीं है, तो इंटरनेट से लाने की कोशिश करो
      return fetch(event.request).catch(() => {
        // 3. अगर इंटरनेट भी नहीं चला, तो offline.html दिखा दो
        return caches.match(OFFLINE_URL);
      });
    })
  );
});

// पुराने कैशे को डिलीट करो
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});