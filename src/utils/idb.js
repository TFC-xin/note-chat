// 简单 IndexedDB wrapper 用于存取 directory handle（structured clone）
const DB_NAME = 'notechat_db_v1';
const STORE_NAME = 'handles';
const STORE_KEY = 'directory';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDirectoryHandle(handle) {
  if (!handle) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(handle, STORE_KEY);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function getDirectoryHandle() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(STORE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('getDirectoryHandle failed', e);
    return null;
  }
}

export async function removeDirectoryHandle() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(STORE_KEY);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('removeDirectoryHandle failed', e);
    return false;
  }
}

// helper to verify/request permission for a handle
// based on File System Access API recommendations
export async function verifyPermission(handle, withWrite = false) {
  if (!handle) return false;
  if (typeof handle.queryPermission === 'function') {
    const opts = { mode: withWrite ? 'readwrite' : 'read' };
    const permission = await handle.queryPermission(opts);
    if (permission === 'granted') return true;
    const request = await handle.requestPermission(opts);
    return request === 'granted';
  }
  // If the API methods do not exist, assume not supported
  return false;
}
