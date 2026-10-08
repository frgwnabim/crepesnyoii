"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { safeAdminRedirect } from "@/lib/admin/auth";
import type { OrderAction } from "@/lib/admin/order-actions";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null; email: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email dan password wajib diisi.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const message =
      error.code === "invalid_credentials"
        ? "Email atau password salah."
        : "Gagal masuk. Coba lagi sebentar ya.";
    return { error: message, email };
  }

  // Akun Supabase yang tidak terdaftar di admin_users tidak boleh masuk panel.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    await supabase.auth.signOut();
    return { error: "Akun ini belum terdaftar sebagai admin booth.", email };
  }

  redirect(safeAdminRedirect(formData.get("next")));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export type OrderActionResult = { ok: true } | { ok: false; error: string };

const ACTION_ERROR: Record<string, string> = {
  NOT_AUTHENTICATED: "Sesi login habis. Silakan login ulang.",
  INVALID_ACTION: "Aksi tidak dikenal.",
  NOT_FOUND: "Pesanan tidak ditemukan.",
  INVALID_TRANSITION: "Status pesanan sudah berubah. Data sudah dimuat ulang, cek lagi ya.",
  NOT_PAID: "Pastikan customer sudah bayar di kasir sebelum menandai selesai.",
  REASON_REQUIRED: "Alasan pembatalan wajib diisi (maks 200 karakter).",
};

// Semua perubahan status/bayar lewat RPC admin_order_action supaya transisi
// divalidasi di database dan order_events tercatat dengan nama admin.
export async function runOrderAction(
  orderId: string,
  action: OrderAction,
  reason?: string,
): Promise<OrderActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_order_action", {
    p_order_id: orderId,
    p_action: action,
    p_reason: reason ?? null,
  });

  // Muat ulang data halaman, baik sukses maupun gagal (status mungkin diubah admin lain).
  refresh();

  if (error) {
    return {
      ok: false,
      error: (error.hint && ACTION_ERROR[error.hint]) || "Gagal menyimpan. Coba lagi ya.",
    };
  }
  return { ok: true };
}
