// lib/kv.js
// Uses Upstash KV if configured. Falls back to in-memory store if not.
let useFallback = !process.env.KV_REST_API_URL;

if (!useFallback) {
  try {
    const { kv } = await import('@vercel/kv');
    export { kv };
  } catch {
    useFallback = true;
  }
}

if (useFallback) {
  // simple in-memory store (per lambda instance) — fine for demos
  const store = (globalThis.__KV ||= {
    map: new Map(),
    lists: new Map(),
    sets: new Map(),
  });

  const kv = {
    async get(key) {
      return store.map.get(key) ?? null;
    },
    async set(key, value, opts) {
      store.map.set(key, value);
      if (opts?.ex) {
        setTimeout(() => store.map.delete(key), opts.ex * 1000);
      }
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

  export { kv };
}
