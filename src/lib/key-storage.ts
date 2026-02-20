/**
 * Secure key storage using IndexedDB.
 * IndexedDB requires specific API calls (not accessible via simple property reads like localStorage),
 * providing better isolation against basic XSS attacks.
 * Falls back to localStorage if IndexedDB is unavailable.
 */

const DB_NAME = 'stealth_e2e_keys';
const DB_VERSION = 1;
const STORE_NAME = 'keys';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(key: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

export async function secureGet(key: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  if (isIndexedDBAvailable()) {
    try {
      const val = await idbGet(key);
      if (val !== null) return val;

      const lsVal = localStorage.getItem(key);
      if (lsVal !== null) {
        await idbSet(key, lsVal);
        localStorage.removeItem(key);
        return lsVal;
      }
      return null;
    } catch {
      return localStorage.getItem(key);
    }
  }
  return localStorage.getItem(key);
}

export async function secureSet(key: string, value: string): Promise<void> {
  if (typeof window === 'undefined') return;

  if (isIndexedDBAvailable()) {
    try {
      await idbSet(key, value);
      localStorage.removeItem(key);
      return;
    } catch {
      // fallback
    }
  }
  localStorage.setItem(key, value);
}

export async function secureDelete(key: string): Promise<void> {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(key);
  if (isIndexedDBAvailable()) {
    try {
      await idbDelete(key);
    } catch {
      // ignore
    }
  }
}

export async function secureHas(key: string): Promise<boolean> {
  return (await secureGet(key)) !== null;
}
