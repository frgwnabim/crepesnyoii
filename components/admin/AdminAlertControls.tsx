"use client";

import { useAdminRealtime } from "@/components/admin/AdminRealtimeProvider";

// Kontrol di sidebar: status koneksi, toggle suara, izin notifikasi browser.
// Di top bar (layar < lg) tampil ringkas: hanya ikon + switch.
export function AdminAlertControls() {
  const { connection, soundOn, setSoundOn, notifyPermission, enableNotifications } =
    useAdminRealtime();

  const connectionLabel =
    connection === "live"
      ? "Realtime aktif"
      : connection === "reconnecting"
        ? "Menyambung ulang..."
        : "Menghubungkan...";

  return (
    <div className="flex items-center gap-3 text-sm lg:flex-col lg:items-stretch lg:px-5 lg:py-4">
      <p className="flex items-center gap-2 text-xs" title={connectionLabel}>
        <span
          aria-hidden
          className={`h-2 w-2 rounded-full ${
            connection === "live"
              ? "bg-emerald-400"
              : connection === "reconnecting"
                ? "animate-pulse bg-amber-400"
                : "bg-slate-500"
          }`}
        />
        <span className="sr-only text-slate-400 lg:not-sr-only">{connectionLabel}</span>
      </p>

      <label className="flex cursor-pointer items-center justify-between gap-2 lg:gap-3">
        <span className="font-semibold text-slate-300">
          <span aria-hidden>{soundOn ? "🔔" : "🔕"}</span>
          <span className="sr-only lg:not-sr-only lg:ml-1">Suara pesanan baru</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={soundOn}
          onClick={() => setSoundOn(!soundOn)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            soundOn ? "bg-emerald-500" : "bg-slate-700"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
              soundOn ? "left-5.5" : "left-0.5"
            }`}
          />
        </button>
      </label>

      {notifyPermission === "default" && (
        <button
          type="button"
          onClick={enableNotifications}
          className="whitespace-nowrap rounded-lg bg-slate-800 px-3 py-2 text-left text-sm font-semibold text-slate-200 hover:bg-slate-700"
        >
          <span className="lg:hidden">Notifikasi</span>
          <span className="hidden lg:inline">Aktifkan notifikasi</span>
        </button>
      )}
      {notifyPermission === "granted" && (
        <p className="hidden text-xs text-slate-400 lg:block">✓ Notifikasi browser aktif</p>
      )}
      {notifyPermission === "denied" && (
        <p className="hidden text-xs text-slate-500 lg:block">
          Notifikasi diblokir. Izinkan lewat ikon gembok di address bar.
        </p>
      )}
    </div>
  );
}
