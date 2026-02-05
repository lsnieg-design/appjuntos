// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// 1. Pega aquí ABAJO tu configuración de Firebase (la misma que tienes en tu App.js)
const firebaseConfig = {
  apiKey: "AIzaSyAsa-o1ykRaY4sy4AhSSrCFApWh-XBhb8M",
  authDomain: "juntos-a-la-par-d3534.firebaseapp.com",
  projectId: "juntos-a-la-par-d3534",
  storageBucket: "juntos-a-la-par-d3534.firebasestorage.app",
  messagingSenderId: "320753617430",
  appId: "1:320753617430:web:964ae79ff0ea94dc520337",
  measurementId: "G-E834BP6PJ6"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Este es el código que escucha cuando la app está CERRADA
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Notificación en segundo plano recibida:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png', // Asegurate que este ícono exista en public
    vibrate: [200, 100, 200]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
