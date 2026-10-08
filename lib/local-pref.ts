// Preferensi kecil per perangkat (localStorage) yang bisa dipakai dengan
// useSyncExternalStore. Semua akses dibungkus try/catch.
export function createBooleanPref(key: string, defaultValue: boolean) {
  const listeners = new Set<() => void>();

  function get(): boolean {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? defaultValue : raw === "1";
    } catch {
      return defaultValue;
    }
  }

  function set(value: boolean) {
    try {
      window.localStorage.setItem(key, value ? "1" : "0");
    } catch {
      // Abaikan, preferensi tidak tersimpan.
    }
    listeners.forEach((l) => l());
  }

  function subscribe(callback: () => void) {
    listeners.add(callback);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) callback();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(callback);
      window.removeEventListener("storage", onStorage);
    };
  }

  return { get, set, subscribe, getServer: () => defaultValue };
}
