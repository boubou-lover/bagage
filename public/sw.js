const CACHE = 'bagage-v14.102';

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

self.addEventListener('message', e => {
  if (e.data?.type === 'GET_VERSION') {
    e.ports[0].postMessage({ version: CACHE });
  }
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Ne jamais intercepter Firebase, Google Auth, APIs externes
  if (url.includes('firebase') || url.includes('googleapis') ||
      url.includes('google.com') || url.includes('gstatic.com') ||
      url.includes('unpkg.com') || url.includes('api.') ||
      url.includes('fonts.') || url.includes('accounts.')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Network-first pour le HTML
  if (e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return r;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first pour les fichiers statiques
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
