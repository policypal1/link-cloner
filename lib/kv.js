// lib/kv.js — simple in-memory "KV" (persists only per serverless instance)
// Good for demos. You can swap back to @vercel/kv later.

const store = (globalThis.__KV ||= {
  map: new Map(),
  lists: new Map(),
  sets: new Map(),
});

export const kv = {
  async get(key) {
    return store.map.get(key) ?? null;
  },
  async set(key, value, opts) {
    store.map.set(key, value);
    if (opts?.ex) setTimeout(() => store.map.delete(key), opts.ex * 1000);
  },
  async sadd(key, member) {
    const s = store.sets.get(key) || new Set();
    s.add(member);
    store.sets.set(key, s);
  },
  async rpush(key, value) {
    const arr = store.lists.get(key) || [];
    arr.push(value);
    store.lists.set(key, arr);
  },
  async lrange(key, start, end) {
    const arr = store.lists.get(key) || [];
    if (end === -1) end = arr.length - 1;
    return arr.slice(start, end + 1);
  }
};
