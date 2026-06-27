// This file runs before any other code in Next.js.
// It patches Node.js v22+'s broken globalThis.localStorage implementation
// to prevent crashes in libraries like @supabase/auth-js.

export async function register() {
  if (typeof globalThis.localStorage !== 'undefined') {
    const storage = globalThis.localStorage;

    // Check if getItem is not a proper function (broken Node.js implementation)
    if (typeof storage.getItem !== 'function') {
      // Replace with a working in-memory implementation
      const memStore: Record<string, string> = {};
      const workingStorage = {
        getItem: (key: string): string | null => memStore[key] ?? null,
        setItem: (key: string, value: string): void => { memStore[key] = String(value); },
        removeItem: (key: string): void => { delete memStore[key]; },
        clear: (): void => { Object.keys(memStore).forEach(k => delete memStore[k]); },
        get length(): number { return Object.keys(memStore).length; },
        key: (index: number): string | null => Object.keys(memStore)[index] ?? null,
      };

      // Try to replace globalThis.localStorage
      try {
        Object.defineProperty(globalThis, 'localStorage', {
          value: workingStorage,
          writable: true,
          configurable: true,
        });
      } catch {
        // If defineProperty fails, try direct assignment
        try {
          (globalThis as any).localStorage = workingStorage;
        } catch {
          // Last resort: delete and reassign
          try {
            delete (globalThis as any).localStorage;
            (globalThis as any).localStorage = workingStorage;
          } catch {
            // Cannot fix localStorage, library will need to handle it
          }
        }
      }
    }
  }
}
