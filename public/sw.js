// Service Worker para Push Notifications e cache offline
// Notificações disfarçadas como manchetes de notícias

const CACHE_NAME = 'noticias24h-v5';
const MESSAGES_CACHE = 'messages-cache-v1';
const MEDIA_CACHE = 'media-cache-v1';
const MAX_MEDIA_CACHE_ITEMS = 200;

const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Limpar caches antigos mas manter mensagens e mídia
          if (cacheName !== CACHE_NAME && cacheName !== MESSAGES_CACHE && cacheName !== MEDIA_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar requisições com estratégia apropriada
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache-first para assets estáticos
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icon')) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((fetchResponse) => {
          if (fetchResponse.ok) {
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return fetchResponse;
        });
      })
    );
    return;
  }

  // Cache-first para mídia (imagens, vídeos)
  if (url.pathname.includes('/storage/v1/object/public/chat-media/') ||
      url.pathname.match(/\.(jpg|jpeg|png|gif|webp|mp4|webm)$/i)) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((fetchResponse) => {
            if (fetchResponse.ok) {
              cache.put(request, fetchResponse.clone());
              // Limitar tamanho do cache de mídia
              trimCache(MEDIA_CACHE, MAX_MEDIA_CACHE_ITEMS);
            }
            return fetchResponse;
          });
        });
      })
    );
    return;
  }

  // Network-first para API calls (cachear para offline)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).then((fetchResponse) => {
        if (request.method === 'GET' && fetchResponse.ok) {
          const responseClone = fetchResponse.clone();
          caches.open(MESSAGES_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return fetchResponse;
      }).catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Retornar resposta offline com status 503
          return new Response(
            JSON.stringify({ error: 'Offline', cached: false }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        });
      })
    );
    return;
  }

  // Fallback padrão: network-first
  event.respondWith(
    fetch(request).catch(() => caches.match(request)).then((response) => {
      return response || fetch(request);
    })
  );
});

// Limitar tamanho do cache
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    // Remover os mais antigos (primeiros inseridos)
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

// Background Sync para sincronizar mensagens pendentes
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncPendingMessages());
  }
});

async function syncPendingMessages() {
  try {
    const db = await openMessagesDB();
    const pendingMessages = await getPendingMessages(db);

    for (const message of pendingMessages) {
      try {
        const response = await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        });

        if (response.ok) {
          await removePendingMessage(db, message.id);
        }
      } catch (error) {
        console.error('Erro ao sincronizar mensagem:', error);
      }
    }
  } catch (error) {
    console.error('Erro no background sync:', error);
  }
}

function openMessagesDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('messages-queue', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending')) {
        db.createObjectStore('pending', { keyPath: 'id' });
      }
    };
  });
}

function getPendingMessages(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending'], 'readonly');
    const store = transaction.objectStore('pending');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function removePendingMessage(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending'], 'readwrite');
    const store = transaction.objectStore('pending');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Push Notifications disfarçadas
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const isMessage = data.isMessage === true;

  let title, body, icon, badge, tag, actions;

  if (isMessage) {
    title = data.title || 'Nova mensagem';
    body = data.body || 'Você recebeu uma nova mensagem';
    icon = '/icon-192.png';
    badge = '/icon-192.png';
    tag = 'message-notification';
    actions = [
      { action: 'view', title: 'Abrir Mensagem' },
      { action: 'dismiss', title: 'Fechar' }
    ];
  } else {
    const newsSources = ['G1', 'BBC Brasil', 'Folha', 'UOL', 'CNN Brasil', 'Globo'];
    const randomSource = newsSources[Math.floor(Math.random() * newsSources.length)];
    title = data.title || 'BREAKING: Nova informação importante';
    body = data.body || `${randomSource} • Agora`;
    icon = '/icon-192.png';
    badge = '/icon-192.png';
    tag = 'news-notification';
    actions = [
      { action: 'view', title: 'Ver Notícia' },
      { action: 'dismiss', title: 'Fechar' }
    ];
  }

  const options = {
    body,
    icon,
    badge,
    tag,
    requireInteraction: false,
    data: {
      url: '/',
      isMessage,
      messageId: data.messageId || null
    },
    actions
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Lidar com cliques nas notificações
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  if (event.notification.data.isMessage) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Se já tem uma janela aberta, focar nela
        for (const client of clientList) {
          if (client.url.includes('/') && 'focus' in client) {
            client.postMessage({
              type: 'SHOW_PIN_PAD',
              messageId: event.notification.data.messageId
            });
            return client.focus();
          }
        }
        // Senão, abrir nova janela
        return clients.openWindow('/');
      })
    );
  } else {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        return clients.openWindow('/');
      })
    );
  }
});
