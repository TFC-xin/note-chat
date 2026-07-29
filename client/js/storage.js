/**
 * storage.js - 本地存储
 * 私聊内容用 IndexedDB 持久化
 * 大厅内容不持久化（按需求）
 * 已读状态用 localStorage
 */

const Storage = (() => {
  const DB_NAME = "notechat";
  const DB_VERSION = 1;
  const STORE = "private";
  const READ_KEY = "notechat.read";

  let db = null;
  let progressCallback = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(STORE)) {
          d.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => { db = req.result; resolve(db); };
      req.onerror = () => reject(req.error);
    });
  }

  async function saveNote(note) {
    if (!note) return;
    // 只保存私聊（带 room 字段且不是 lobby）
    if (!note.room || note.room === "lobby") return;
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(note);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function saveMany(notes) {
    if (!notes || !notes.length) return;
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      let i = 0;
      for (const n of notes) {
        if (n.room && n.room !== "lobby") {
          store.put(n);
          if (progressCallback) progressCallback(++i, notes.length);
        }
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function loadAll() {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function clearAll() {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // 已读状态（localStorage 足够）
  function getReadSet() {
    try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]")); }
    catch (e) { return new Set(); }
  }
  function markRead(id) {
    const s = getReadSet();
    s.add(id);
    localStorage.setItem(READ_KEY, JSON.stringify([...s]));
  }
  function isRead(id) { return getReadSet().has(id); }

  // 用户设置
  const SETTINGS_KEY = "notechat.settings";
  const defaultSettings = {
    inkColor: "#1a1a1a",
    paperColor: "#faf7f0",
    bgColor: "#f5f0e4",
    inkWidth: 2.2
  };
  function getSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      return Object.assign({}, defaultSettings, s);
    } catch (e) { return Object.assign({}, defaultSettings); }
  }
  function saveSettings(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }
  function resetSettings() {
    localStorage.removeItem(SETTINGS_KEY);
    return Object.assign({}, defaultSettings);
  }

  return {
    openDB, saveNote, saveMany, loadAll, clearAll,
    getReadSet, markRead, isRead,
    getSettings, saveSettings, resetSettings,
    setProgressCallback: (cb) => { progressCallback = cb; }
  };
})();