const CACHE_NAME = 'massfinder-v2_20260306_02';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/parish_data.json',
  '/events.json',
  '/manifest.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Sans+3:wght@400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.Default.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      var old = keys.filter(k => k !== CACHE_NAME);
      return Promise.all(old.map(k => caches.delete(k))).then(() => {
        if (old.length) {
          self.clients.matchAll().then(clients => {
            clients.forEach(c => c.postMessage({ type: 'CACHE_UPDATED' }));
          });
        }
      });
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always pass API calls and external services straight to the network — never cache them.
  // This covers the readings API, saint API, Web3Forms, Google Analytics, fonts, etc.
  const NETWORK_ONLY_HOSTS = [
    'massfinder-readings-api.vercel.app',
    'api.web3forms.com',
    'www.googletagmanager.com',
    'www.google-analytics.com',
    'universalis.com',
    'mgbhmwnaipopdctbihmf.supabase.co',
  ];
  if (NETWORK_ONLY_HOSTS.some(h => url.hostname === h)) {
    // Let the browser handle it directly — no SW involvement
    return;
  }

  // For API routes and data files: stale-while-revalidate
  if (url.pathname.startsWith('/api/') || url.pathname === '/parish_data.json' || url.pathname === '/events.json') {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const fetchPromise = fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          }).catch(() => {
            if (cached) return cached;
            return new Response(JSON.stringify({ error: 'offline' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // For shell assets: cache-first, fall back to network
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
