const CACHE_NAME = 'noa-v3';
const ASSETS = [
  '/',
  '/arena/',
  '/arena/achievements/',
  '/blog/',
  '/quotes/',
  '/styles/global.css',
  '/scripts/app.js',
  '/scripts/arena.js',
  '/scripts/achievements.js',
  '/scripts/quotes.js',
  '/ninja_victory.jpg',
  '/ninja_avatar.jpg',
  '/shadow_avatar.jpg',
  '/inner_strength_emblem.jpg',
  '/shadow_boss.jpg',
  '/favicon.svg',
  '/manifest.json'
];

// Install Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (Network-first with Cache-fallback for HTML, Cache-first for Assets)
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // For API, data, admin, or CMS paths, let them bypass service worker cache
  if (
    url.pathname.includes('/admin/') ||
    url.pathname.includes('/api/') ||
    url.pathname.includes('/data/') ||
    url.hostname.includes('api.github.com')
  ) {
    return;
  }

  // Network-first for pages, Cache-first for images/styles/scripts
  const isNavigation = e.request.mode === 'navigate';
  
  if (isNavigation) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then((cachedRes) => {
        if (cachedRes) return cachedRes;
        return fetch(e.request).then((networkRes) => {
          if (networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
          }
          return networkRes;
        });
      })
    );
  }
});
