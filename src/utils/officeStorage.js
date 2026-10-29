const DATABASE_NAME = 'dogeub-office-suite';
const DATABASE_VERSION = 1;
let databasePromise;

function openDatabase() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('documents')) database.createObjectStore('documents', { keyPath: 'id' });
        if (!database.objectStoreNames.contains('fonts')) database.createObjectStore('fonts', { keyPath: 'name' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Local office storage could not be opened.'));
    });
  }
  return databasePromise;
}

async function withStore(name, mode, action) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(name, mode);
    const request = action(transaction.objectStore(name));
    let result;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error || new Error('Local office storage request failed.'));
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error || new Error('Local office storage transaction failed.'));
    transaction.onabort = () => reject(transaction.error || new Error('Local office storage transaction was cancelled.'));
  });
}

export const listOfficeDocuments = (type) => withStore('documents', 'readonly', (store) => store.getAll())
  .then((documents) => documents.filter((document) => !type || document.type === type).sort((a, b) => b.updatedAt - a.updatedAt));
export const saveOfficeDocument = (document) => withStore('documents', 'readwrite', (store) => store.put(document));
export const deleteOfficeDocument = (id) => withStore('documents', 'readwrite', (store) => store.delete(id));
export const listOfficeFonts = () => withStore('fonts', 'readonly', (store) => store.getAll());
export const saveOfficeFont = (font) => withStore('fonts', 'readwrite', (store) => store.put(font));
export const deleteOfficeFont = (name) => withStore('fonts', 'readwrite', (store) => store.delete(name));

export function downloadOfficeFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('The file could not be read.'));
    reader.readAsDataURL(file);
  });
}

export function decodeDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;,]+);base64,([a-z\d+/=]+)$/i);
  if (!match) throw new Error('This image format is not supported for export.');
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return { mime: match[1], bytes };
}

export function safeFileName(value, fallback = 'Untitled') {
  return String(value || fallback).trim().replace(/[\\/:*?"<>|]+/g, '-').slice(0, 100) || fallback;
}
