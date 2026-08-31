const CACHE_NAME = 'pwa-cache-v5';
const OFFLINE_URL = '/offline.html';

// Only precache files that are guaranteed to exist. A missing file in
// cache.addAll() rejects the entire install event, leaving the service worker
// without an active registration and breaking PushManager subscriptions.
const PRECACHE_URLS = [
  '/',
  OFFLINE_URL,
  '/manifest.json',
  '/icon-192.png',
  '/pinnacle-logo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((name) => {
        if (name.startsWith('pwa-cache-') && name !== CACHE_NAME) return caches.delete(name);
        return Promise.resolve();
      })))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Authentication, admin, signup and push-subscription requests must stay online.
  if (
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/api/auth/') ||
    url.pathname.startsWith('/api/push/') ||
    url.pathname.startsWith('/api/contact')
  ) return;

  const isApiGet = url.pathname.startsWith('/api/');
  const isAppResource =
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.headers.get('RSC') === '1';

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok && (isApiGet || isAppResource)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return response;
      });

      return cached || network.catch(() => new Response('', { status: 503, statusText: 'Offline' }));
    })
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}

  const title = data.title || 'Pinnacle Tutors Academy';
  const options = {
    body: data.body || 'You have a new announcement.',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => 'focus' in client);
      if (existing) {
        existing.navigate(target);
        return existing.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
