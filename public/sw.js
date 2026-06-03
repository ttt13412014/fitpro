// FitPro Service Worker
const CACHE_NAME = 'fitpro-v1';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/workout',
  '/nutrition',
  '/manifest.json',
];

// Install: cachear assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignorar errores en precache
      });
    })
  );
  self.skipWaiting();
});

// Activate: limpiar caches viejas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network first, fallback a cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, Supabase API, Anthropic API
  if (
    request.method !== 'GET' ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('anthropic.com') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Para navegación: network first con fallback a cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/dashboard')))
    );
    return;
  }

  // Para assets estáticos: cache first
  if (
    url.pathname.includes('/_next/static/') ||
    url.pathname.includes('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg')
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
            return response;
          })
      )
    );
    return;
  }
});

// Background sync para workouts pendientes (cuando vuelve la conexión)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-workouts') {
    event.waitUntil(syncPendingWorkouts());
  }
});

async function syncPendingWorkouts() {
  // En una versión futura: sincronizar workouts guardados offline
  console.log('[SW] Syncing pending workouts...');
}
