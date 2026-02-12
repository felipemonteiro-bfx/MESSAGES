// Service Worker para Push Notifications (Sugestão 3)
// Notificações disfarçadas como manchetes de notícias

const CACHE_NAME = 'noticias-br-v1';
const urlsToCache = [
  '/',
  '/manifest.json'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});

// Sugestão 3: Receber Push Notifications disfarçadas
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  // Gerar título disfarçado como manchete
  const newsSources = ['G1', 'BBC Brasil', 'Folha', 'UOL', 'CNN Brasil', 'Globo'];
  const randomSource = newsSources[Math.floor(Math.random() * newsSources.length)];
  
  const title = data.title || 'BREAKING: Nova informação importante';
  const options = {
    body: `${randomSource} • Agora`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'news-notification',
    requireInteraction: false,
    data: {
      url: '/',
      isMessage: data.isMessage || false,
      messageId: data.messageId || null
    },
    actions: [
      {
        action: 'view',
        title: 'Ver Notícia'
      },
      {
        action: 'dismiss',
        title: 'Fechar'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Sugestão 3: Lidar com cliques nas notificações
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Se for mensagem, abrir app e depois pedir PIN
  if (event.notification.data.isMessage) {
    event.waitUntil(
      clients.openWindow('/').then(() => {
        // Enviar mensagem para o app pedir PIN
        return clients.matchAll().then((clientList) => {
          clientList.forEach((client) => {
            client.postMessage({
              type: 'SHOW_PIN_PAD',
              messageId: event.notification.data.messageId
            });
          });
        });
      })
    );
  } else {
    // Notificação normal, apenas abrir app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
