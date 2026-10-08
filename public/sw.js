// Service worker minimal khusus notifikasi.
// Chrome Android tidak mengizinkan `new Notification()` dari halaman, jadi
// notifikasi ditampilkan lewat registration.showNotification().
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin);

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const same = windows.find((c) => new URL(c.url).pathname === target.pathname);
      if (same) return same.focus();
      return self.clients.openWindow(target.href);
    })(),
  );
});
