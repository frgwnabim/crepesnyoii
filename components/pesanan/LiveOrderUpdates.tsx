"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ToastStack, useToasts, type Toast } from "@/components/ui/Toasts";
import {
  getNotifyPermission,
  requestNotificationPermission,
  showBrowserNotification,
  subscribeNotifyPermission,
  vibrate,
} from "@/lib/notify";
import { createClient } from "@/lib/supabase/client";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

const POLL_INTERVAL_MS = 20_000;
const FINAL_STATUSES: OrderStatus[] = ["selesai", "dibatalkan"];

type Props = {
  code: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
};

type StatusPayload = { status: OrderStatus; payment_status: PaymentStatus };

function statusToast(status: OrderStatus, code: string): Omit<Toast, "id"> | null {
  switch (status) {
    case "dikonfirmasi":
      return { title: "Pesananmu sudah dikonfirmasi!", body: "Tim booth sudah terima pesananmu." };
    case "disiapkan":
      return { title: "Crepe-mu sedang disiapkan!", body: "Lagi digulung, sebentar lagi ya." };
    case "siap_diambil":
      return {
        title: `Crepe-mu siap! Tunjukkan kode ${code} di booth.`,
        body: "Jangan lupa bayar di kasir ya.",
        tone: "highlight",
        sticky: true,
      };
    case "selesai":
      return { title: "Selamat menikmati!", body: "Makasih sudah jajan di Nyoii.", tone: "success" };
    case "dibatalkan":
      return { title: "Pesananmu dibatalkan", body: "Cek alasannya di halaman ini ya.", sticky: true };
    default:
      return null;
  }
}

export function LiveOrderUpdates({ code, status, paymentStatus }: Props) {
  const router = useRouter();
  const { toasts, push, dismiss } = useToasts();
  const [reconnecting, setReconnecting] = useState(false);
  const permission = useSyncExternalStore(
    subscribeNotifyPermission,
    getNotifyPermission,
    () => "unsupported" as const,
  );

  // Status terakhir yang sudah kita "umumkan", supaya broadcast dan polling
  // tidak memicu toast dobel untuk perubahan yang sama.
  const known = useRef<StatusPayload>({ status, payment_status: paymentStatus });

  useEffect(() => {
    const supabase = createClient();
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let wasDisconnected = false;
    let disposed = false;

    function handleUpdate(next: StatusPayload) {
      const prev = known.current;
      if (next.status === prev.status && next.payment_status === prev.payment_status) return;
      known.current = next;
      // Render ulang bagian server (timeline, badge bayar, alasan batal).
      router.refresh();

      if (next.status !== prev.status) {
        const toast = statusToast(next.status, code);
        if (toast) push(toast);

        const ready = next.status === "siap_diambil";
        if (ready) vibrate([300, 120, 300, 120, 600]);
        // Siap diambil selalu dikabari; status lain hanya kalau tab tidak dilihat.
        if (toast && (ready || document.visibilityState !== "visible")) {
          void showBrowserNotification(ready ? "Crepe-mu siap! 🎉" : toast.title, {
            body: ready ? `Tunjukkan kode ${code} di booth.` : toast.body,
            url: `/pesanan/${code}`,
            tag: `order-${code}`,
            requireInteraction: ready,
            vibrate: ready ? [300, 120, 300, 120, 600] : undefined,
          });
        }
      } else if (next.payment_status === "lunas") {
        push({ title: "Pembayaran diterima. Makasih!", tone: "success" });
      }
    }

    async function poll() {
      const { data } = await supabase.rpc("get_order_by_code", { p_code: code });
      if (!disposed && data) handleUpdate(data as StatusPayload);
    }

    function startPolling() {
      if (pollTimer) return;
      pollTimer = setInterval(poll, POLL_INTERVAL_MS);
    }

    function stopPolling() {
      clearInterval(pollTimer);
      pollTimer = undefined;
    }

    const channel = supabase
      .channel(`order:${code}`, { config: { private: false } })
      .on("broadcast", { event: "status_changed" }, ({ payload }) => {
        handleUpdate(payload as StatusPayload);
      })
      .subscribe((state) => {
        if (disposed) return;
        if (state === "SUBSCRIBED") {
          setReconnecting(false);
          stopPolling();
          // Kejar perubahan yang terlewat selama terputus.
          if (wasDisconnected) void poll();
          wasDisconnected = false;
        } else {
          wasDisconnected = true;
          setReconnecting(true);
          startPolling();
        }
      });

    // HP sering "menidurkan" tab di background: cek sekali saat kembali dibuka.
    function onVisible() {
      if (document.visibilityState === "visible") void poll();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      disposed = true;
      stopPolling();
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [code, router, push]);

  const isFinal = FINAL_STATUSES.includes(status);

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismiss} theme="customer" />

      {reconnecting && !isFinal && (
        <p
          role="status"
          className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-cocoa px-3 py-1.5 text-xs font-semibold text-white shadow-lg"
        >
          <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-amber-300" />
          Menyambung ulang
        </p>
      )}

      {!isFinal && <NotifyPrompt permission={permission} />}
    </>
  );
}

function NotifyPrompt({ permission }: { permission: ReturnType<typeof getNotifyPermission> }) {
  if (permission === "default") {
    return (
      <button
        type="button"
        onClick={() => void requestNotificationPermission()}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-cocoa shadow-sm ring-2 ring-pink transition-colors hover:bg-pink/10"
      >
        🔔 Kabari aku kalau sudah siap
      </button>
    );
  }

  const text =
    permission === "granted"
      ? "✓ Kamu akan dikabari saat crepe-mu siap. Biarkan halaman ini tetap terbuka ya."
      : permission === "denied"
        ? "Notifikasi diblokir di browser. Tenang, status tetap update otomatis selama halaman ini terbuka."
        : "Biarkan halaman ini terbuka, status pesananmu update otomatis di sini.";

  return <p className="text-center text-xs text-cocoa/60">{text}</p>;
}
