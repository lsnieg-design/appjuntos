// Service worker actualizado: prioriza siempre la versión publicada más reciente.
// Solo utiliza la caché como respaldo cuando no hay conexión.
const CACHE_NAME = 'juntos-a-la-par-v2-20261102';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // No interceptar escrituras, servicios externos ni llamadas a Firebase.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    try {
      // Network-first: index.html y los recursos de la app se actualizan
      // desde el servidor en cada navegación/visita.
      const freshRequest = new Request(request, { cache: 'no-store' });
      const response = await fetch(freshRequest);

      if (response && response.ok && response.type === 'basic') {
        try {
          await cache.put(request, response.clone());
        } catch (cacheError) {
          console.warn('No se pudo actualizar la caché local:', cacheError);
        }
      }
      return response;
    } catch (error) {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) return cachedResponse;

      if (request.mode === 'navigate') {
        const offlinePage = (await cache.match('/index.html')) || (await cache.match('/'));
        if (offlinePage) return offlinePage;
      }

      return new Response('Recurso no disponible sin conexión.', {
        status: 503,
        statusText: 'Offline'
      });
    }
  })());
});
