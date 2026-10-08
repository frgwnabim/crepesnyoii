import type { Metadata } from "next";
import { Suspense } from "react";
import { SlotManager, type AdminSlotRow } from "@/components/admin/SlotManager";
import { getAdminUser } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Slot Waktu",
};

export default function AdminSlotPage() {
  return (
    <main className="px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Slot Waktu</h1>
        <p className="text-sm text-slate-500">
          Atur kuota per jam ambil. Slot nonaktif tidak bisa dipilih customer.
        </p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white" />}>
        <SlotList />
      </Suspense>
    </main>
  );
}

async function SlotList() {
  await getAdminUser();
  const supabase = await createClient();

  // Hitungan "terisi" sama dengan aturan kuota di database:
  // semua pesanan di slot itu yang tidak dibatalkan.
  const [slotsRes, ordersRes] = await Promise.all([
    supabase
      .from("pickup_slots")
      .select("id, slot_time, max_orders, is_active")
      .order("slot_time", { ascending: true }),
    supabase.from("orders").select("pickup_slot_id").neq("status", "dibatalkan"),
  ]);

  const error = slotsRes.error ?? ordersRes.error;
  if (error) {
    return (
      <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
        Gagal memuat slot: {error.message}
      </p>
    );
  }

  const used = new Map<string, number>();
  for (const o of ordersRes.data ?? []) {
    used.set(o.pickup_slot_id, (used.get(o.pickup_slot_id) ?? 0) + 1);
  }

  const slots: AdminSlotRow[] = (slotsRes.data ?? []).map((s) => ({
    ...s,
    used_count: used.get(s.id) ?? 0,
  }));

  return <SlotManager slots={slots} />;
}
