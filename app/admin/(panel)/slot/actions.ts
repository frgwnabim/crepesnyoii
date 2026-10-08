"use server";

import { refresh } from "next/cache";
import { getAdminUser } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

const MAX_ORDERS_LIMIT = 999;

export async function updateSlotCapacity(id: string, maxOrders: number): Promise<ActionResult> {
  await getAdminUser();
  if (!Number.isInteger(maxOrders) || maxOrders < 0 || maxOrders > MAX_ORDERS_LIMIT) {
    return { ok: false, error: `Kuota harus angka 0 sampai ${MAX_ORDERS_LIMIT}.` };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pickup_slots")
    .update({ max_orders: maxOrders })
    .eq("id", id)
    .select("id");

  refresh();
  if (error || !data?.length) return { ok: false, error: "Gagal menyimpan kuota." };
  return { ok: true };
}

export async function setSlotActive(id: string, active: boolean): Promise<ActionResult> {
  await getAdminUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pickup_slots")
    .update({ is_active: active })
    .eq("id", id)
    .select("id");

  refresh();
  if (error || !data?.length) return { ok: false, error: "Gagal mengubah slot." };
  return { ok: true };
}

// "Tutup pemesanan web": nonaktifkan semua slot sekaligus. open=true membuka semuanya lagi.
export async function setAllSlotsActive(open: boolean): Promise<ActionResult> {
  await getAdminUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("pickup_slots")
    .update({ is_active: open })
    .eq("is_active", !open);

  refresh();
  if (error) {
    return { ok: false, error: open ? "Gagal membuka slot." : "Gagal menutup pemesanan web." };
  }
  return { ok: true };
}
