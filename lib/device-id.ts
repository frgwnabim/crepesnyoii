// Identitas perangkat sederhana untuk rate limit create_order (3 pesanan/jam).
// Bukan keamanan kuat: bisa direset dengan hapus data browser. Lihat README.
const STORAGE_KEY = "crepenyoii:device-id";
let memoryFallback: string | null = null;

export function getDeviceId(): string {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && /^[A-Za-z0-9-]{8,64}$/.test(saved)) return saved;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // localStorage diblokir: pakai ID sementara selama tab terbuka.
    memoryFallback ??= crypto.randomUUID();
    return memoryFallback;
  }
}
