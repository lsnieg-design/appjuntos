import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Tu configuración (La misma que usaste en el SW)
const firebaseConfig = {
 apiKey: "AIzaSyAsa-o1ykRaY4sy4AhSSrCFApWh-XBhb8M",
  authDomain: "juntos-a-la-par-d3534.firebaseapp.com",
  projectId: "juntos-a-la-par-d3534",
  storageBucket: "juntos-a-la-par-d3534.firebasestorage.app",
  messagingSenderId: "320753617430",
  appId: "1:320753617430:web:964ae79ff0ea94dc520337"
};

// 1. Inicializar Firebase
const app = initializeApp(firebaseConfig);

// 2. Inicializar Messaging
export const messaging = getMessaging(app);

// 3. Función para pedir permisos y obtener el token
export const requestPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Permiso de notificación concedido.');
      
      // Obtener el token
      const currentToken = await getToken(messaging, {
        // IMPORTANTE: Necesitas generar este key en la consola de Firebase
        vapidKey: "BLtqtHLQvIIDs53Or78_JwxhFNKZaQM6S7rD4gbRoanfoh_YtYSbFbGHCWyHtZgXuL6Dm3rCvirHgW6fB_FUXrw" 
      });

      if (currentToken) {
        console.log('Token generado:', currentToken);
        // TODO: Aquí deberías enviar este token a tu base de datos para guardarlo asociado al usuario
        return currentToken;
      } else {
        console.log('No se pudo obtener el token.');
      }
    } else {
      console.log('Permiso de notificación denegado.');
    }
  } catch (error) {
    console.error('Error al pedir permiso:', error);
  }
};

// 4. Escuchar mensajes en primer plano (cuando la app está abierta)
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("Mensaje recibido en primer plano:", payload);
      resolve(payload);
    });
  });
