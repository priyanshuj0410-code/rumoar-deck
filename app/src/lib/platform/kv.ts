/**
 * Small device-local key-value store for things that must not round-trip to the server:
 * onboarding resume position, install-prompt dismissal, draft message text.
 *
 * localStorage throws in Safari private mode, so every call is guarded.
 */
export const kv = {
  get<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(`rumoar:${key}`);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },

  set(key: string, value: unknown): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(`rumoar:${key}`, JSON.stringify(value));
    } catch {
      /* quota or private mode — device-local state is best-effort by design */
    }
  },

  remove(key: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(`rumoar:${key}`);
    } catch {
      /* see set() */
    }
  },
};
