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
  const isMessage = data.isMessage === true; // Mensagem real vs notícia
  
  let title, body, icon, badge, tag, requireInteraction, actions;
  
  if (isMessage) {
    // Notificação de mensagem real (não disfarçada)
    title = data.title || 'Nova mensagem';
    body = data.body || 'Você recebeu uma nova mensagem';
    icon = '/icon-192.svg'; // Usar ícone do app
    badge = '/icon-192.svg';
    tag = 'message-notification';
    requireInteraction = false;
    actions = [
      {
        action: 'view',
        title: 'Abrir Mensagem'
      },
      {
        action: 'dismiss',
        title: 'Fechar'
      }
    ];
  } else {
    // Notificação disfarçada como notícia
    const newsSources = ['G1', 'BBC Brasil', 'Folha', 'UOL', 'CNN Brasil', 'Globo'];
    const randomSource = newsSources[Math.floor(Math.random() * newsSources.length)];
    title = data.title || 'BREAKING: Nova informação importante';
    body = data.body || `${randomSource} • Agora`;
    icon = '/icon-192.svg';
    badge = '/icon-192.svg';
    tag = 'news-notification';
    requireInteraction = false;
    actions = [
      {
        action: 'view',
        title: 'Ver Notícia'
      },
      {
        action: 'dismiss',
        title: 'Fechar'
      }
    ];
  }

  const options = {
    body: body,
    icon: icon,
    badge: badge,
    tag: tag,
    requireInteraction: requireInteraction,
    data: {
      url: '/',
      isMessage: isMessage,
      messageId: data.messageId || null
    },
    actions: actions
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
