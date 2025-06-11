
// Импортируем Workbox
importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

if (workbox) {
  console.log(`Workbox успешно загружен.`);

  const OFFLINE_FALLBACK_PAGE = '/offline.html';
  const OLD_CUSTOM_CACHE_NAME = 'bk-courier-cache-v1.1';

  // --- Управление жизненным циклом Service Worker ---
  // Принудительная активация нового SW при получении сообщения SKIP_WAITING
  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      console.log('Service Worker: получен сигнал SKIP_WAITING, активируемся...');
      self.skipWaiting();
    }
  });

  // Включаем Navigation Preload, если поддерживается
  if (workbox.navigationPreload.isSupported()) {
    workbox.navigationPreload.enable();
    console.log('Service Worker: Navigation Preload включен.');
  } else {
    console.log('Service Worker: Navigation Preload не поддерживается.');
  }

  // --- Прекеширование ---
  // Список ресурсов для немедленного кеширования при установке SW
  // Ревизии нужны для корректного обновления кеша Workbox.
  // Здесь можно использовать хеши файлов или простые версии.
  // Для простоты сейчас установим 'v1'. При изменении файла, меняйте ревизию.
  workbox.precaching.precacheAndRoute([
    { url: '/index.html', revision: 'v1.2' }, // Updated revision
    { url: '/index.css', revision: 'v1.1' },
    { url: '/index.js', revision: 'v1.1' },
    { url: '/manifest.json', revision: 'v1.1' },
    { url: '/icons/icon-192x192.png', revision: 'v1.1' },
    { url: '/icons/icon-512x512.png', revision: 'v1.1' },
    { url: OFFLINE_FALLBACK_PAGE, revision: 'v1.1' }
  ]);
  console.log('Service Worker: Настроено прекеширование ресурсов.');


  // --- Стратегии кеширования для Runtime ---

  // 1. Навигационные запросы (HTML страницы)
  // Стратегия: Сначала сеть, если ошибка (нет сети) - показать офлайн-страницу из кеша.
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'navigation-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 10, // Кешируем до 10 навигационных запросов
        }),
        { // Пользовательский плагин для возврата офлайн-страницы при ошибке сети
          handlerDidError: async () => {
            console.log('Service Worker: Ошибка сети при навигации, показываем офлайн-страницу.');
            return await caches.match(OFFLINE_FALLBACK_PAGE) || Response.error();
          }
        }
      ]
    })
  );

  // 2. CSS и JavaScript файлы
  // Стратегия: Stale-While-Revalidate (быстрый ответ из кеша, если есть, параллельно обновление из сети)
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'style' || request.destination === 'script',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'static-resources-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50, // Макс. 50 статических ресурсов
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 дней
        }),
      ],
    })
  );

  // 3. Изображения
  // Стратегия: CacheFirst (если есть в кеше - отдаем, иначе сеть и кешируем)
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'image-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60, // Макс. 60 изображений
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 дней
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200], // Кешируем в т.ч. непрозрачные ответы (для CDN)
        }),
      ],
    })
  );

  // 4. Шрифты (если есть)
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'font',
    new workbox.strategies.CacheFirst({
      cacheName: 'font-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 год
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // --- Активация Service Worker ---
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      Promise.all([
        // Очистка кешей, не управляемых текущей версией Workbox
        workbox.precaching.cleanupOutdatedCaches(),
        // Удаление старого пользовательского кеша, если он есть
        caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (cacheName === OLD_CUSTOM_CACHE_NAME) {
                console.log(`Service Worker: Удаление старого кеша '${OLD_CUSTOM_CACHE_NAME}'.`);
                return caches.delete(cacheName);
              }
            })
          );
        }),
        // Захват контроля над клиентами
        self.clients.claim().then(() => console.log('Service Worker: Захватил контроль над клиентами.'))
      ]).then(() => {
        console.log('Service Worker: Активирован и готов к работе.');
      })
    );
  });

} else {
  console.error(`Workbox не удалось загрузить. Service Worker не будет работать.`);
}