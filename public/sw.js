const CACHE_NAME = 'juntos-al-apar-v1';

// Instalación simple sin forzar descargas masivas que puedan fallar
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activación inmediata
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia de red con respaldo en caché
self.addEventListener('fetch', (event) => {
  // Evitamos cachear peticiones de Firebase o APIs externas si las hubiera
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('identitytoolkit')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            // Guardamos dinámicamente en caché lo que el usuario va visitando
            if (event.request.method === 'GET' && fetchResponse.status === 200) {
              cache.put(event.request, fetchResponse.clone());
            }
            return fetchResponse;
          });
        });
      }).catch(() => {
        // Fallback opcional si no hay conexión
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});
