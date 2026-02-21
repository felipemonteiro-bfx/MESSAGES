/**
 * Sugestão 13: Cache Inteligente de Mídia
 * Gerencia cache local de imagens e vídeos com limpeza automática
 */

const MEDIA_CACHE_DB = 'media-cache';
const MEDIA_CACHE_VERSION = 1;
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_CACHE_AGE = 30 * 24 * 60 * 60 * 1000; // 30 dias

interface CachedMedia {
  url: string;
  blob: Blob;
  timestamp: number;
  size: number;
}

let db: IDBDatabase | null = null;

/**
 * Inicializar IndexedDB para cache de mídia
 */
async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MEDIA_CACHE_DB, MEDIA_CACHE_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains('media')) {
        const store = database.createObjectStore('media', { keyPath: 'url' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('size', 'size', { unique: false });
      }
    };
  });
}

/**
 * Obter mídia do cache
 */
export async function getCachedMedia(url: string): Promise<Blob | null> {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['media'], 'readonly');
      const store = transaction.objectStore('media');
      const request = store.get(url);

      request.onsuccess = () => {
        const cached = request.result as CachedMedia | undefined;
        if (cached) {
          // Verificar se ainda está válido (não expirou)
          const age = Date.now() - cached.timestamp;
          if (age < MAX_CACHE_AGE) {
            resolve(cached.blob);
          } else {
            // Expirou, remover do cache
            deleteCachedMedia(url);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao buscar mídia do cache:', error);
    return null;
  }
}

/**
 * Salvar mídia no cache
 */
export async function cacheMedia(url: string, blob: Blob): Promise<void> {
  try {
    const database = await initDB();
    const cached: CachedMedia = {
      url,
      blob,
      timestamp: Date.now(),
      size: blob.size,
    };

    // Verificar tamanho do cache antes de adicionar
    await ensureCacheSize(blob.size);

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['media'], 'readwrite');
      const store = transaction.objectStore('media');
      const request = store.put(cached);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao salvar mídia no cache:', error);
  }
}

/**
 * Remover mídia do cache
 */
async function deleteCachedMedia(url: string): Promise<void> {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['media'], 'readwrite');
      const store = transaction.objectStore('media');
      const request = store.delete(url);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao remover mídia do cache:', error);
  }
}

/**
 * Obter tamanho total do cache
 */
async function getCacheSize(): Promise<number> {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['media'], 'readonly');
      const store = transaction.objectStore('media');
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result as CachedMedia[];
        const totalSize = items.reduce((sum, item) => sum + item.size, 0);
        resolve(totalSize);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao calcular tamanho do cache:', error);
    return 0;
  }
}

/**
 * Garantir que cache não exceda tamanho máximo
 */
async function ensureCacheSize(newItemSize: number): Promise<void> {
  try {
    const currentSize = await getCacheSize();
    const projectedSize = currentSize + newItemSize;

    if (projectedSize <= MAX_CACHE_SIZE) {
      return;
    }

    const database = await initDB();
    
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(['media'], 'readwrite');
      const store = transaction.objectStore('media');
      const index = store.index('timestamp');
      const request = index.getAll();

      request.onsuccess = () => {
        const items = request.result as CachedMedia[];
        items.sort((a, b) => a.timestamp - b.timestamp);

        let sizeToFree = projectedSize - MAX_CACHE_SIZE;
        for (const item of items) {
          if (sizeToFree <= 0) break;
          store.delete(item.url);
          sizeToFree -= item.size;
        }
      };
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
  }
}

/**
 * Limpar cache expirado
 */
export async function cleanExpiredCache(): Promise<void> {
  try {
    const database = await initDB();
    const transaction = database.transaction(['media'], 'readwrite');
    const store = transaction.objectStore('media');
    const index = store.index('timestamp');
    const request = index.getAll();

    request.onsuccess = () => {
      const items = request.result as CachedMedia[];
      const now = Date.now();

      items.forEach((item) => {
        const age = now - item.timestamp;
        if (age >= MAX_CACHE_AGE) {
          store.delete(item.url);
        }
      });
    };
  } catch (error) {
    console.error('Erro ao limpar cache expirado:', error);
  }
}

/**
 * Limpar todo o cache
 */
export async function clearAllCache(): Promise<void> {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['media'], 'readwrite');
      const store = transaction.objectStore('media');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
  }
}

/**
 * Buscar mídia com fallback para cache
 */
export async function fetchMediaWithCache(url: string): Promise<Blob> {
  // Tentar cache primeiro
  const cached = await getCachedMedia(url);
  if (cached) {
    return cached;
  }

  // Se não estiver em cache, buscar da rede
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erro ao buscar mídia: ${response.statusText}`);
  }

  const blob = await response.blob();
  
  // Salvar no cache para próxima vez
  await cacheMedia(url, blob);

  return blob;
}
