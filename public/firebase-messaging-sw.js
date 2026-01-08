// Archivo: public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// --- PEGA AQUÍ TU CONFIGURACIÓN DE FIREBASE ---
// (Cópiala de tu App.js, pero asegúrate de que sean strings con comillas)
const firebaseConfig = {
  apiKey: "AIzaSyAsa-o1ykRaY4sy4AhSSrCFApWh-XBhb8M",
  authDomain: "juntos-a-la-par-d3534.firebaseapp.com",
  projectId: "juntos-a-la-par-d3534",
  storageBucket: "juntos-a-la-par-d3534.firebasestorage.app",
  messagingSenderId: "320753617430",
  appId: "1:320753617430:web:964ae79ff0ea94dc520337",
  measurementId: "G-E834BP6PJ6"
};

// Inicializar Firebase en segundo plano
firebase.initializeApp(firebaseConfig);

// Obtener la instancia de mensajería
const messaging = firebase.messaging();

// Esta función maneja la notificación cuando la App está CERRADA
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Notificación en segundo plano recibida:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png', // Asegúrate de que este archivo exista en la carpeta public
    badge: '/icon-192.png', // Icono pequeño para la barra de estado (blanco y transparente idealmente)
    vibrate: [200, 100, 200]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
