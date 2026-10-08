// Daftar kode pesanan yang pernah dibuat di perangkat ini (localStorage).
// Semua akses dibungkus try/catch: localStorage bisa diblokir (mode privat, dsb).
const STORAGE_KEY = "crepenyoii:recent-orders";
const MAX_SAVED = 5;
const listeners = new Set<() => void>();

export function readRecentOrdersRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function parseRecentOrders(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((c): c is string => typeof c === "string")
      : [];
  } catch {
    return [];
  }
}

export function saveRecentOrder(code: string) {
  try {
    const codes = parseRecentOrders(readRecentOrdersRaw()).filter((c) => c !== code);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([code, ...codes].slice(0, MAX_SAVED)),
    );
    listeners.forEach((l) => l());
  } catch {
    // Abaikan: shortcut di landing page hanya bonus.
  }
}

export function subscribeRecentOrders(callback: () => void) {
  listeners.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}
