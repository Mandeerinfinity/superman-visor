// IndexedDB gallery for photos and clips.
let dbp = null;
function db() { if (dbp) return dbp; dbp = new Promise((res, rej) => { if (!('indexedDB' in self)) return rej(new Error('no idb')); const r = indexedDB.open('nickVisor', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('media', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); return dbp; }
const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('media', mode), st = t.objectStore('media'); const q = fn(st); t.oncomplete = () => res(q?.result); t.onerror = () => rej(t.error); }); };
export const gallery = {
  add: (item) => tx('readwrite', s => s.put({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 6), t: Date.now(), ...item })),
  list: async () => { try { const a = await tx('readonly', s => s.getAll()); return (a || []).sort((x, y) => y.t - x.t); } catch (e) { return []; } },
  del: (id) => tx('readwrite', s => s.delete(id))
};
