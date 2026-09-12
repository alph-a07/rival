import "fake-indexeddb/auto";

// Setup a mock for localStorage in the test environment, since jsdom doesn't provide one by default.
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => store.get(key) ?? null,

      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },

      removeItem: (key: string) => {
        store.delete(key);
      },

      clear: () => store.clear(),

      key: (index: number) => Array.from(store.keys())[index] ?? null,

      get length() {
        return store.size;
      },
    },
    configurable: true,
  });
}
