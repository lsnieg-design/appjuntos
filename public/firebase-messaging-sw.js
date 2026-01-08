 // Archivo: public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAsa-o1ykRaY4sy4AhSSrCFApWh-XBhb8M", // (Por seguridad no lo pongo aquí, COPIA EL DE TU FOTO)
  authDomain: "juntos-a-la-par-d3534.firebaseapp.com",
  projectId: "juntos-a-la-par-d3534",
  storageBucket: "juntos-a-la-par-d3534.appspot.com",
  messagingSenderId: "320753617430",
  appId: "1:320753617430:web:964ae79ff0ea94dc520337"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[SW] Notificación recibida:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico',
    badge: '/icon-192.png' // Asegúrate de tener este icono en public
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
