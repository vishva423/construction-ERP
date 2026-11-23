type PendingCapture = {
  id: string;
  taskId: string;
  captureType: 'selfie' | 'supervisor-capture';
  blob: Blob;
  latitude?: number;
  longitude?: number;
  createdAt: string;
};

const databaseName = 'rt-infratech-verification';
const storeName = 'pending-captures';

function openQueue(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Offline capture storage could not be opened.'));
  });
}

export async function enqueueCapture(capture: Omit<PendingCapture, 'id' | 'createdAt'>) {
  const db = await openQueue();
  const entry: PendingCapture = { ...capture, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).add(entry);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Capture could not be queued offline.'));
  });
  db.close();
}

export async function pendingCaptureCount(): Promise<number> {
  const db = await openQueue();
  const count = await new Promise<number>((resolve, reject) => {
    const request = db.transaction(storeName).objectStore(storeName).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Offline capture queue could not be read.'));
  });
  db.close();
  return count;
}

export async function syncPendingCaptures(apiBase: string, token: string): Promise<number> {
  const db = await openQueue();
  const entries = await new Promise<PendingCapture[]>((resolve, reject) => {
    const request = db.transaction(storeName).objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as PendingCapture[]);
    request.onerror = () => reject(request.error ?? new Error('Offline capture queue could not be read.'));
  });
  let uploaded = 0;
  for (const entry of entries) {
    const form = new FormData();
    form.append('file', entry.blob, `${entry.captureType}-${entry.createdAt}.jpg`);
    if (entry.latitude !== undefined) form.append('latitude', String(entry.latitude));
    if (entry.longitude !== undefined) form.append('longitude', String(entry.longitude));
    const route = `/verification/tasks/${entry.taskId}/${entry.captureType}`;
    const response = await fetch(`${apiBase}${route}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!response.ok) {
      if (response.status >= 500) break;
      throw new Error(`Queued verification capture ${entry.taskId} was rejected (${response.status}); it remains stored on this device.`);
    }
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).delete(entry.id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Synced capture could not be removed from the local queue.'));
    });
    uploaded += 1;
  }
  db.close();
  return uploaded;
}
