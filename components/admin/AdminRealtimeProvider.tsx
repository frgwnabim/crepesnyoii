"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ToastStack, useToasts } from "@/components/ui/Toasts";
import { formatSlotTime } from "@/lib/format";
import { createBooleanPref } from "@/lib/local-pref";
import {
  getNotifyPermission,
  requestNotificationPermission,
  showBrowserNotification,
  subscribeNotifyPermission,
  type NotifyPermission,
} from "@/lib/notify";
import { createClient } from "@/lib/supabase/client";

const POLL_INTERVAL_MS = 20_000;
const soundPref = createBooleanPref("crepenyoii:admin-sound", true);

export type ConnectionState = "connecting" | "live" | "reconnecting";

type AdminRealtimeValue = {
  pendingCount: number | null;
  connection: ConnectionState;
  soundOn: boolean;
  setSoundOn: (on: boolean) => void;
  notifyPermission: NotifyPermission;
  enableNotifications: () => Promise<void>;
};

const AdminRealtimeContext = createContext<AdminRealtimeValue | null>(null);

type OrderInsertRow = {
  id: string;
  code: string;
  customer_name: string;
  pickup_slot_id: string;
};

export function AdminRealtimeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { toasts, push, dismiss } = useToasts();
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");

  const soundOn = useSyncExternalStore(soundPref.subscribe, soundPref.get, soundPref.getServer);
  const notifyPermission = useSyncExternalStore(
    subscribeNotifyPermission,
    getNotifyPermission,
    () => "unsupported" as const,
  );

  // Ref supaya callback realtime (dibuat sekali) selalu baca nilai terbaru.
  const soundOnRef = useRef(soundOn);
  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playSound = useCallback(() => {
    if (!soundOnRef.current) return;
    try {
      audioRef.current ??= new Audio("/sounds/new-order.wav");
      audioRef.current.currentTime = 0;
      // Bisa ditolak browser kalau admin belum pernah klik apa pun di halaman.
      void audioRef.current.play().catch(() => {});
    } catch {
      // Abaikan.
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let wasDisconnected = false;
    let disposed = false;

    async function fetchPendingCount() {
      const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "menunggu_konfirmasi");
      if (!disposed && !error) setPendingCount(count ?? 0);
    }

    // Gabungkan beberapa perubahan beruntun jadi satu refresh server.
    function scheduleRefresh() {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 400);
    }

    async function handleInsert(row: OrderInsertRow) {
      const { data: slot } = await supabase
        .from("pickup_slots")
        .select("slot_time")
        .eq("id", row.pickup_slot_id)
        .maybeSingle();
      const time = slot ? `, ambil ${formatSlotTime(slot.slot_time)}` : "";
      const message = `Pesanan baru ${row.code} dari ${row.customer_name}${time}`;
      const href = `/admin/pesanan/${row.id}`;

      push({ title: message, tone: "highlight", action: { label: "Lihat", href }, sticky: true });
      playSound();
      if (document.visibilityState !== "visible") {
        void showBrowserNotification("Pesanan baru!", { body: message, url: href, tag: row.id });
      }
    }

    function startPolling() {
      if (pollTimer) return;
      pollTimer = setInterval(() => {
        router.refresh();
        void fetchPendingCount();
      }, POLL_INTERVAL_MS);
    }

    function stopPolling() {
      clearInterval(pollTimer);
      pollTimer = undefined;
    }

    void fetchPendingCount();

    const channel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          void handleInsert(payload.new as OrderInsertRow);
          scheduleRefresh();
          void fetchPendingCount();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => {
          scheduleRefresh();
          void fetchPendingCount();
        },
      )
      .subscribe((status) => {
        if (disposed) return;
        if (status === "SUBSCRIBED") {
          setConnection("live");
          stopPolling();
          // Kejar perubahan yang terlewat selama terputus.
          if (wasDisconnected) {
            scheduleRefresh();
            void fetchPendingCount();
          }
          wasDisconnected = false;
        } else {
          wasDisconnected = true;
          setConnection("reconnecting");
          startPolling();
        }
      });

    return () => {
      disposed = true;
      clearTimeout(refreshTimer);
      stopPolling();
      void supabase.removeChannel(channel);
    };
  }, [router, push, playSound]);

  const enableNotifications = useCallback(async () => {
    await requestNotificationPermission();
  }, []);

  return (
    <AdminRealtimeContext.Provider
      value={{
        pendingCount,
        connection,
        soundOn,
        setSoundOn: soundPref.set,
        notifyPermission,
        enableNotifications,
      }}
    >
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} theme="admin" />
    </AdminRealtimeContext.Provider>
  );
}

export function useAdminRealtime() {
  const ctx = useContext(AdminRealtimeContext);
  if (!ctx) throw new Error("useAdminRealtime harus di dalam <AdminRealtimeProvider>");
  return ctx;
}
