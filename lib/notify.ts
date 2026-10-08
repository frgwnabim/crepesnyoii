// Helper Notification API untuk admin dan customer.
// Izin hanya diminta lewat klik tombol (requestNotificationPermission), tidak otomatis.

export type NotifyPermission = NotificationPermission | "unsupported";

const listeners = new Set<() => void>();

export function getNotifyPermission(): NotifyPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function subscribeNotifyPermission(callback: () => void) {
  listeners.add(callback);
  let status: PermissionStatus | undefined;
  navigator.permissions
    ?.query({ name: "notifications" as PermissionName })
    .then((s) => {
      status = s;
      s.onchange = callback;
    })
    .catch(() => {});
  return () => {
    listeners.delete(callback);
    if (status) status.onchange = null;
  };
}

async function getServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    await navigator.serviceWorker.register("/sw.js");
    // Tunggu worker aktif, tapi jangan selamanya.
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotifyPermission> {
  if (getNotifyPermission() === "unsupported") return "unsupported";
  try {
    const result = await Notification.requestPermission();
    if (result === "granted") void getServiceWorker();
    return result;
  } finally {
    listeners.forEach((l) => l());
  }
}

type ShowOptions = {
  body?: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
  vibrate?: number[];
};

export async function showBrowserNotification(title: string, options: ShowOptions = {}) {
  if (getNotifyPermission() !== "granted") return;
  const { url, ...rest } = options;
  // vibrate didukung di Android walau tidak ada di tipe DOM bawaan TypeScript.
  const notificationOptions = {
    ...rest,
    icon: "/icon.svg",
    data: { url },
  } as NotificationOptions;

  const registration = await getServiceWorker();
  if (registration) {
    try {
      await registration.showNotification(title, notificationOptions);
      return;
    } catch {
      // Lanjut ke cara biasa di bawah.
    }
  }

  try {
    const n = new Notification(title, notificationOptions);
    n.onclick = () => {
      window.focus();
      if (url) window.location.href = url;
      n.close();
    };
  } catch {
    // Browser tidak mendukung notifikasi dari halaman (misal Chrome Android tanpa SW).
  }
}

export function vibrate(pattern: number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Tidak didukung (iOS, desktop): abaikan.
  }
}
