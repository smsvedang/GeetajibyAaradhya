// --- GITADHYA PWA & PUSH SETUP ---

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered');

            // Initialize Firebase UI Side (Shared Config)
            if (typeof firebase !== 'undefined') {
                const firebaseConfig = {
                    apiKey: "AIzaSyCmAzjIpbPy1ENyiLoURLWg2cI7fBWcUa4",
                    authDomain: "warrior-aaradhya.firebaseapp.com",
                    projectId: "warrior-aaradhya",
                    messagingSenderId: "105939562180",
                    appId: "1:105939562180:web:6eb2d862a01902a98fe391"
                };

                if (!firebase.apps.length) {
                    firebase.initializeApp(firebaseConfig);
                }

                const messaging = firebase.messaging();

                const registerToken = async (token) => {
                    await fetch('/api/push/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token })
                    });
                    console.log('Push Token synced with server');
                };

                // Request Token
                try {
                    const token = await messaging.getToken({ serviceWorkerRegistration: registration });
                    if (token) {
                        await registerToken(token);
                    } else {
                        console.log('No token available. Requesting permission...');
                        requestNotificationPermission(messaging);
                    }
                } catch (err) {
                    console.log('An error occurred while retrieving token. ', err);
                    if (Notification.permission !== 'granted') {
                        requestNotificationPermission(messaging);
                    }
                }
            }
        } catch (error) {
            console.error('Service Worker Registration failed:', error);
        }
    });
}

async function requestNotificationPermission(messaging) {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await messaging.getToken();
            if (token) {
                await fetch('/api/push/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });
                console.log('Push Token registered after permission granted');
            }
        }
    } catch (e) {
        console.error('Permission request failed', e);
    }
}
