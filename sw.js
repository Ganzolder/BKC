
const CACHE_NAME = 'bk-courier-cache-v1.1'; // Incremented version for update
const urlsToCache = [
  // Ensure a leading slash for root-relative paths if your server serves from root
  // or adjust paths if served from a subdirectory.
  // Assuming served from root:
  '/', // Alias for index.html
  '/index.html',
  '/index.css',
  '/index.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
  // If you have a specific favicon.ico, add it here too e.g. '/favicon.ico'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Force the waiting service worker to become the active service worker.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching files:', urlsToCache);
        return cache.addAll(urlsToCache)
          .catch(error => {
            console.error('Failed to cache one or more resources during install:', error);
            // Optional: throw error to fail SW install if critical assets fail
          });
      })
  );
});

self.addEventListener('fetch', event => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Cache hit - return response
        if (cachedResponse) {
          return cachedResponse;
        }

        // Not in cache - network request, then cache
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse; // Don't cache error responses or non-basic types
            }

            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          }
        ).catch(error => {
          console.error('Fetch failed; returning offline page instead.', error);
          // Optional: return a custom offline page if a specific asset like index.html fails
          // For now, just let the browser handle the error (e.g. "No internet" page)
          // if (event.request.mode === 'navigate') { // For HTML page navigations
          //   return caches.match('/offline.html'); // You would need an offline.html cached
          // }
        });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Ensure new SW takes control immediately
  );
});
