// Minimal in-memory stand-in for the ioredis calls used by the app.
export function createFakeRedis() {
  const store = new Map<string, string>();
  return {
    store,
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async set(key: string, value: string, ...args: (string | number)[]) {
      if (args.includes("NX") && store.has(key)) return null;
      store.set(key, value);
      return "OK";
    },
    async mget(...keys: string[]) {
      return keys.map((k) => store.get(k) ?? null);
    },
    async del(...keys: string[]) {
      let n = 0;
      for (const k of keys) if (store.delete(k)) n++;
      return n;
    },
    // Only the compare-and-delete script is used by the app.
    async eval(_script: string, _numKeys: number, key: string, token: string) {
      if (store.get(key) === token) {
        store.delete(key);
        return 1;
      }
      return 0;
    },
  };
}
