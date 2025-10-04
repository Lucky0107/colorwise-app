// VERSION は Vite define で注入された値を利用
const CACHE_NAME = 'colorwise-' + (self?.__APP_VERSION__ || 'dev');
const urlsToCache = [
  // index.htmlはキャッシュしない（常に最新版を取得）
  '/colorwise-app/manifest.json',
  '/colorwise-app/colorwise-icon.svg',
  '/colorwise-app/icon-192.png',
  '/colorwise-app/icon-512.png'
];

// インストール時のキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// フェッチ時のキャッシュ戦略（ネットワーク優先）
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // index.htmlは常にネットワークから取得（キャッシュしない）
  if (url.pathname === '/colorwise-app/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // オフライン時のみキャッシュから返す
        return caches.match(event.request);
      })
    );
    return;
  }

  // その他のリソースはネットワーク優先
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // レスポンスが有効でない場合はキャッシュから返す
        if (!response || response.status !== 200) {
          return caches.match(event.request).then(cachedResponse => {
            return cachedResponse || response;
          });
        }

        // 静的リソース（画像、manifest等）のみキャッシュに保存
        if (event.request.url.includes('/colorwise-app/')) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }

        return response;
      })
      .catch(() => {
        // ネットワークエラーの場合はキャッシュから返す
        return caches.match(event.request);
      })
  );
// メッセージ受信（即時更新リクエスト）
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

});

// アクティベート時の古いキャッシュ削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});