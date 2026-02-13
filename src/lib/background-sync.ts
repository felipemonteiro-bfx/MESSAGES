/**
 * Sugestão 15: Sincronização em Background
 * Gerencia fila de mensagens pendentes para sincronização offline
 */

interface PendingMessage {
  id: string;
  chatId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio';
  mediaUrl?: string;
  timestamp: number;
  retryCount: number;
}

const DB_NAME = 'messages-queue';
const DB_VERSION = 1;
const STORE_NAME = 'pending';
const MAX_RETRIES = 3;

/**
 * Abrir IndexedDB para fila de mensagens
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('chatId', 'chatId', { unique: false });
      }
    };
  });
}

/**
 * Adicionar mensagem à fila de sincronização
 */
export async function queueMessage(message: Omit<PendingMessage, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
  try {
    const db = await openDB();
    const pendingMessage: PendingMessage = {
      ...message,
      id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(pendingMessage);

      request.onsuccess = () => {
        // Registrar sync para quando conexão voltar
        if ('serviceWorker' in navigator && 'sync' in (self as any).registration) {
          (self as any).registration.sync.register('sync-messages').catch(() => {
            // Background Sync pode não estar disponível
          });
        }
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao adicionar mensagem à fila:', error);
  }
}

/**
 * Remover mensagem da fila após sincronização bem-sucedida
 */
export async function removeQueuedMessage(messageId: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(messageId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao remover mensagem da fila:', error);
  }
}

/**
 * Obter todas as mensagens pendentes
 */
export async function getPendingMessages(): Promise<PendingMessage[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao buscar mensagens pendentes:', error);
    return [];
  }
}

/**
 * Incrementar contador de tentativas
 */
async function incrementRetryCount(messageId: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(messageId);

      getRequest.onsuccess = () => {
        const message = getRequest.result as PendingMessage;
        if (message) {
          message.retryCount += 1;
          const putRequest = store.put(message);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('Erro ao incrementar contador de tentativas:', error);
  }
}

/**
 * Sincronizar mensagens pendentes (chamado pelo Service Worker)
 */
export async function syncPendingMessages(
  sendMessageFn: (message: PendingMessage) => Promise<boolean>
): Promise<void> {
  const pending = await getPendingMessages();
  
  for (const message of pending) {
    // Não tentar mais se excedeu limite de tentativas
    if (message.retryCount >= MAX_RETRIES) {
      await removeQueuedMessage(message.id);
      continue;
    }

    try {
      const success = await sendMessageFn(message);
      if (success) {
        await removeQueuedMessage(message.id);
      } else {
        await incrementRetryCount(message.id);
      }
    } catch (error) {
      console.error('Erro ao sincronizar mensagem:', error);
      await incrementRetryCount(message.id);
    }
  }
}

/**
 * Verificar se há mensagens pendentes
 */
export async function hasPendingMessages(): Promise<boolean> {
  const pending = await getPendingMessages();
  return pending.length > 0;
}
