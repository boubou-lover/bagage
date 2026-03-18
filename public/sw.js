// Bump this version on each deploy to bust the cache
const CACHE = 'bagage-v12.123';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['/', '/index.html', '/manifest.json', '/style.css']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Répondre à la demande de version depuis l'app
self.addEventListener('message', e => {
  if (e.data?.type === 'GET_VERSION') {
    e.ports[0].postMessage({ version: CACHE });
  }
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Always network-first for the HTML page itself
  if (e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then(r => { caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Always network for Firebase, APIs, CDN libs
  if (url.includes('firebase') || url.includes('googleapis') || url.includes('unpkg.com') ||
      url.includes('api.') || url.includes('fonts.')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // Cache-first for icons and other static files
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
