// Storage for the Files app. Files live in this browser's IndexedDB (not on a server),
// so large videos and documents fit, and they stay until the user deletes them or clears site data.

const DB_NAME = 'dogeub-files';
const STORE = 'files';

export const FOLDERS = ['Documents', 'Screenshots', 'Pictures', 'Videos', 'Music', 'Other'];

const DOC_EXT = /\.(pdf|docx?|xlsx?|pptx?|odt|ods|odp|rtf|txt|md|csv|tsv|json|xml|epub|pages|numbers|key)$/i;
const SCREENSHOT_NAME = /screen[\s_-]?shot|screen[\s_-]?capture|snip|capture/i;

const EXT_TYPES = {
  pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown', csv: 'text/csv', json: 'application/json',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mkv: 'video/x-matroska',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', flac: 'audio/flac',
};

/** The file's type, or a guess from its extension when the browser left it blank. */
export const typeOf = (file) => file.type || EXT_TYPES[(file.name.split('.').pop() || '').toLowerCase()] || 'application/octet-stream';

/** Picks a starting folder for a file from its type and name. The user can move it afterwards. */
export const categorize = (file) => {
  const type = typeOf(file);
  if (type.startsWith('video/')) return 'Videos';
  if (type.startsWith('audio/')) return 'Music';
  if (type.startsWith('image/')) return SCREENSHOT_NAME.test(file.name) ? 'Screenshots' : 'Pictures';
  if (type === 'application/pdf' || type.startsWith('text/') || DOC_EXT.test(file.name)) return 'Documents';
  return 'Other';
};

const open = () =>
  new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('This browser does not support file storage.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Could not open file storage.'));
    req.onblocked = () => reject(new Error('File storage is blocked by another tab. Close other DogeUB tabs and retry.'));
  });

const run = async (mode, fn) => {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error('Storage error.'));
      tx.onabort = () => reject(tx.error || new Error('Storage error.'));
      result = fn(tx.objectStore(STORE), (v) => {
        result = v;
      });
    });
  } finally {
    db.close();
  }
};

const newId = () =>
  crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** Every saved file, newest first. Each item includes its Blob. */
export const listFiles = () =>
  run('readonly', (store, set) => {
    const req = store.getAll();
    req.onsuccess = () => set((req.result || []).sort((a, b) => b.modified - a.modified));
  }).then((r) => r || []);

/** Saves one imported file. Throws an Error with a readable message (e.g. when storage is full). */
export const addFile = async (file, folder) => {
  const now = Date.now();
  const item = {
    id: newId(),
    name: file.name || 'Untitled',
    type: typeOf(file),
    size: file.size,
    folder: folder || categorize(file),
    created: now,
    modified: now,
    // Copy into a fresh Blob so we never keep a handle on the user's original file.
    blob: file.slice(0, file.size, typeOf(file)),
  };
  try {
    await run('readwrite', (store) => {
      store.add(item);
    });
  } catch (err) {
    if (err?.name === 'QuotaExceededError' || /quota/i.test(String(err?.message))) {
      throw new Error(`Not enough storage space for "${item.name}". Delete some files and try again.`);
    }
    throw new Error(`Could not import "${item.name}". Folders and unreadable files can't be imported.`);
  }
  return item;
};

export const updateFile = (id, changes) =>
  run('readwrite', (store) => {
    const get = store.get(id);
    get.onsuccess = () => {
      if (get.result) store.put({ ...get.result, ...changes, modified: Date.now() });
    };
  });

export const deleteFiles = (ids) =>
  run('readwrite', (store) => {
    ids.forEach((id) => store.delete(id));
  });

/** { used, quota } in bytes for this site, or null when the browser can't say. */
export const getUsage = async () => {
  try {
    const { usage, quota } = await navigator.storage.estimate();
    return { used: usage || 0, quota: quota || 0 };
  } catch {
    return null;
  }
};

/** Asks the browser not to evict saved files when disk space is low. Silent and best-effort. */
export const requestPersistence = async () => {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // ignore
  }
};

export const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const n = bytes / 1024 ** i;
  return `${n >= 100 || i === 0 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
};

/** Downloads one file with its original name. */
export const downloadBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};

/* ---------- Minimal ZIP writer (no compression), so "Export all" needs no extra library ---------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crcUpdate = (crc, bytes) => {
  let c = crc;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return c;
};

const crc32OfBlob = async (blob) => {
  let crc = 0xffffffff;
  const reader = blob.stream().getReader();
  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    const { done, value } = await reader.read();
    if (done) break;
    crc = crcUpdate(crc, value);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const dosDateTime = (ms) => {
  const d = new Date(ms);
  const year = Math.max(1980, d.getFullYear());
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
};

const ZIP_LIMIT = 4 * 1024 * 1024 * 1024 - 1024 * 1024; // standard ZIP tops out at 4 GB

/** Builds a .zip Blob from saved items, grouped by folder. Throws if the total is too big for a standard zip. */
export const buildZip = async (items, onProgress) => {
  const total = items.reduce((s, i) => s + i.size, 0);
  if (total > ZIP_LIMIT) throw new Error('Those files add up to more than 4 GB. Export them in smaller groups.');
  if (items.length > 65000) throw new Error('Too many files for one zip. Export them in smaller groups.');

  const enc = new TextEncoder();
  const parts = [];
  const central = [];
  const used = new Set();
  let offset = 0;

  for (let idx = 0; idx < items.length; idx += 1) {
    const item = items[idx];
    const safeName = item.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_') || 'file';
    let path = `${item.folder}/${safeName}`;
    for (let n = 2; used.has(path.toLowerCase()); n += 1) {
      const dot = safeName.lastIndexOf('.');
      path = `${item.folder}/${dot > 0 ? `${safeName.slice(0, dot)} (${n})${safeName.slice(dot)}` : `${safeName} (${n})`}`;
    }
    used.add(path.toLowerCase());

    const nameBytes = enc.encode(path);
    // eslint-disable-next-line no-await-in-loop
    const crc = await crc32OfBlob(item.blob);
    const { time, date } = dosDateTime(item.modified);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, item.size, true);
    local.setUint32(22, item.size, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);
    parts.push(local.buffer, nameBytes, item.blob);

    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint16(8, 0x0800, true);
    cen.setUint16(10, 0, true);
    cen.setUint16(12, time, true);
    cen.setUint16(14, date, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, item.size, true);
    cen.setUint32(24, item.size, true);
    cen.setUint16(28, nameBytes.length, true);
    cen.setUint32(42, offset, true);
    central.push(cen.buffer, nameBytes);

    offset += 30 + nameBytes.length + item.size;
    onProgress?.(idx + 1, items.length);
  }

  const centralSize = central.reduce((s, p) => s + (p.byteLength ?? p.length), 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, items.length, true);
  end.setUint16(10, items.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
};
