// Service Worker para Push Notifications (Sugestão 3)
// Notificações disfarçadas como manchetes de notícias

// Sugestão 25: Sincronização offline melhorada
const CACHE_NAME = 'stealth-messaging-v2';
const MESSAGES_CACHE = 'messages-cache-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
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
          // Sugestão 25: Limpar caches antigos mas manter mensagens
          if (cacheName !== CACHE_NAME && cacheName !== MESSAGES_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Sugestão 25: Tomar controle imediato de todas as páginas
  return self.clients.claim();
});

// Sugestão 25: Interceptar requisições com estratégia melhorada
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Cache primeiro para assets estáticos
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icon')) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((fetchResponse) => {
          // Cachear resposta para uso offline
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
  
  // Network first para API calls (mas cachear para offline)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).then((fetchResponse) => {
        // Cachear respostas GET bem-sucedidas
        if (request.method === 'GET' && fetchResponse.ok) {
          const responseClone = fetchResponse.clone();
          caches.open(MESSAGES_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return fetchResponse;
      }).catch(() => {
        // Se offline, tentar cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Retornar resposta offline genérica
          return new Response(
            JSON.stringify({ error: 'Offline', cached: true }),
            { 
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        });
      })
    );
    return;
  }
  
  // Fallback padrão
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request);
    })
  );
});

// Sugestão 15: Background Sync para sincronizar mensagens pendentes
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(
      syncPendingMessages()
    );
  }
});

async function syncPendingMessages() {
  try {
    // Buscar mensagens pendentes do IndexedDB
    const db = await openMessagesDB();
    const pendingMessages = await getPendingMessages(db);
    
    // Tentar enviar cada mensagem pendente
    for (const message of pendingMessages) {
      try {
        const response = await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        });
        
        if (response.ok) {
          // Remover da fila de pendentes
          await removePendingMessage(db, message.id);
        }
      } catch (error) {
        console.error('Erro ao sincronizar mensagem:', error);
        // Manter na fila para próxima tentativa
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

// Sugestão 15: Background Sync para sincronizar mensagens pendentes
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(
      // Sincronizar mensagens pendentes quando conexão voltar
      syncPendingMessages()
    );
  }
});

async function syncPendingMessages() {
  try {
    // Buscar mensagens pendentes do IndexedDB
    const db = await openMessagesDB();
    const pendingMessages = await getPendingMessages(db);
    
    // Tentar enviar cada mensagem pendente
    for (const message of pendingMessages) {
      try {
        const response = await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        });
        
        if (response.ok) {
          // Remover da fila de pendentes
          await removePendingMessage(db, message.id);
        }
      } catch (error) {
        console.error('Erro ao sincronizar mensagem:', error);
        // Manter na fila para próxima tentativa
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
    request.onsuccess = () => resolve(request.result);
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

// Sugestão 13: Cache de mídia melhorado
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Cache de mídia (imagens, vídeos) com estratégia cache-first
  if (url.pathname.includes('/storage/v1/object/public/chat-media/') || 
      url.pathname.match(/\.(jpg|jpeg|png|gif|webp|mp4|webm)$/i)) {
    event.respondWith(
      caches.open(MESSAGES_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            // Retornar do cache e atualizar em background
            fetch(request).then((fetchResponse) => {
              if (fetchResponse.ok) {
                cache.put(request, fetchResponse.clone());
              }
            }).catch(() => {
              // Ignorar erros de atualização
            });
            return cachedResponse;
          }
          // Se não estiver em cache, buscar e cachear
          return fetch(request).then((fetchResponse) => {
            if (fetchResponse.ok) {
              cache.put(request, fetchResponse.clone());
            }
            return fetchResponse;
          });
        });
      })
    );
    return;
  }
  
  // ... resto do código de fetch existente
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
