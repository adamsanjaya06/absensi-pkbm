import { AttendanceRecord } from '../types';

const DB_NAME = 'absensi_attendance_db';
const DB_VERSION = 1;
const STORE_NAME = 'records';

function openAttendanceDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Save records to IndexedDB without any 5MB quota restrictions
 */
export async function idbSaveAttendanceRecords(records: AttendanceRecord[]): Promise<void> {
  try {
    const db = await openAttendanceDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const record of records) {
      if (record && record.id) {
        store.put(record);
      }
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to save attendance records:', err);
  }
}

/**
 * Get all attendance records from IndexedDB
 */
export async function idbGetAttendanceRecords(): Promise<AttendanceRecord[]> {
  try {
    const db = await openAttendanceDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const results = (request.result || []) as AttendanceRecord[];
        results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        db.close();
        resolve(results);
      };
      request.onerror = () => {
        db.close();
        resolve([]);
      };
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to read attendance records:', err);
    return [];
  }
}

/**
 * Delete a specific record from IndexedDB
 */
export async function idbDeleteAttendanceRecord(id: string): Promise<void> {
  try {
    const db = await openAttendanceDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    return new Promise((resolve) => {
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to delete record:', err);
  }
}
