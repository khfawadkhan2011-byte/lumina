import type { Shot } from "./types";

const DB_NAME = "lumina-camera";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("shots")) {
        db.createObjectStore("shots", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("blobs")) {
        db.createObjectStore("blobs");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveShot(shot: Shot, jpeg: Blob, thumb: Blob) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["shots", "blobs"], "readwrite");
    tx.objectStore("shots").put(shot);
    tx.objectStore("blobs").put(jpeg, `${shot.id}:full`);
    tx.objectStore("blobs").put(thumb, `${shot.id}:thumb`);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listShots(): Promise<Shot[]> {
  const db = await openDb();
  const rows = await reqToPromise(
    db.transaction("shots").objectStore("shots").getAll() as IDBRequest<Shot[]>,
  );
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getShot(id: string): Promise<Shot | undefined> {
  const db = await openDb();
  return reqToPromise(
    db.transaction("shots").objectStore("shots").get(id) as IDBRequest<Shot | undefined>,
  );
}

export async function getBlob(id: string, kind: "full" | "thumb"): Promise<Blob | undefined> {
  const db = await openDb();
  return reqToPromise(
    db.transaction("blobs").objectStore("blobs").get(`${id}:${kind}`) as IDBRequest<
      Blob | undefined
    >,
  );
}

export async function updateShot(shot: Shot) {
  const db = await openDb();
  await reqToPromise(db.transaction("shots", "readwrite").objectStore("shots").put(shot));
}

export async function deleteShot(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["shots", "blobs"], "readwrite");
    tx.objectStore("shots").delete(id);
    tx.objectStore("blobs").delete(`${id}:full`);
    tx.objectStore("blobs").delete(`${id}:thumb`);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
