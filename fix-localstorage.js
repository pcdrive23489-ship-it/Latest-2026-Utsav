// Preload script to fix Node.js v22+'s broken localStorage before any modules load.
// Node 22+ has a built-in localStorage that lacks proper getItem/setItem/removeItem methods.

if (typeof globalThis.localStorage !== 'undefined') {
  const storage = globalThis.localStorage;
  if (typeof storage.getItem !== 'function') {
    const memStore = {};
    const workingStorage = {
      getItem: (key) => memStore[key] !== undefined ? memStore[key] : null,
      setItem: (key, value) => { memStore[key] = String(value); },
      removeItem: (key) => { delete memStore[key]; },
      clear: () => { Object.keys(memStore).forEach(k => delete memStore[k]); },
      get length() { return Object.keys(memStore).length; },
      key: (index) => Object.keys(memStore)[index] || null,
    };
    try {
      Object.defineProperty(globalThis, 'localStorage', {
        value: workingStorage,
        writable: true,
        configurable: true,
      });
    } catch (e) {
      try {
        delete globalThis.localStorage;
        globalThis.localStorage = workingStorage;
      } catch (e2) {
        // Cannot fix
      }
    }
  }
}
