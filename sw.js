const CACHE_NAME = 'cell-calculator-v2.0.0';
const STATIC_CACHE_NAME = 'cell-calculator-static-v2.0.0';
const DYNAMIC_CACHE_NAME = 'cell-calculator-dynamic-v2.0.0';

// 需要快取的靜態資源
const STATIC_FILES = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com'
];

// 安裝事件 - 快取靜態資源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting(); // 立即激活新的 SW
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// 激活事件 - 清理舊快取
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim(); // 立即控制所有頁面
      })
  );
});

// 攔截網路請求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 只處理同源請求和 CDN 資源
  if (url.origin === location.origin || url.hostname === 'cdn.tailwindcss.com') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          // 如果快取中有資源，直接返回
          if (cachedResponse) {
            console.log('[SW] Serving from cache:', request.url);
            return cachedResponse;
          }
          
          // 否則從網路獲取
          console.log('[SW] Fetching from network:', request.url);
          return fetch(request)
            .then((networkResponse) => {
              // 如果網路請求成功，將回應加入動態快取
              if (networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(DYNAMIC_CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return networkResponse;
            })
            .catch((error) => {
              console.error('[SW] Network fetch failed:', error);
              
              // 如果是 HTML 請求且網路失敗，返回離線頁面
              if (request.headers.get('accept').includes('text/html')) {
                return caches.match('./');
              }
              
              // 其他請求返回錯誤
              throw error;
            });
        })
    );
  }
});

// 後台同步事件（未來可用於數據同步）
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // 這裡可以添加後台同步邏輯
      console.log('[SW] Performing background sync')
    );
  }
});

// 推送通知事件（未來可用於提醒功能）
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : '細胞培養計算器有新消息',
    icon: 'https://cdn-icons-png.flaticon.com/512/3845/3845731.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/3845/3845731.png',
    tag: 'cell-calculator-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: '打開應用',
        icon: 'https://cdn-icons-png.flaticon.com/512/3845/3845731.png'
      },
      {
        action: 'close',
        title: '關閉',
        icon: 'https://cdn-icons-png.flaticon.com/512/3845/3845731.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('細胞培養計算器', options)
  );
});

// 通知點擊事件
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          // 如果應用已經打開，就聚焦到該視窗
          for (const client of clientList) {
            if (client.url.includes('cell-calculator') && 'focus' in client) {
              return client.focus();
            }
          }
          // 否則打開新視窗
          if (clients.openWindow) {
            return clients.openWindow('./');
          }
        })
    );
  }
});