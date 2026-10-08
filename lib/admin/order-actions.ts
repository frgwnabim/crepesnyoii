import type { OrderStatus, PaymentStatus } from "@/lib/types";

// Harus sama dengan aksi di RPC admin_order_action.
export type OrderAction = "konfirmasi" | "siapkan" | "siap" | "selesai" | "lunas" | "batalkan";

export const ORDER_ACTION_LABEL: Record<OrderAction, string> = {
  konfirmasi: "Konfirmasi",
  siapkan: "Mulai Siapkan",
  siap: "Tandai Siap Diambil",
  lunas: "Tandai Lunas",
  selesai: "Selesai",
  batalkan: "Batalkan",
};

export const CANCEL_REASONS = ["Stok habis", "Customer tidak datang"] as const;

// Aksi utama yang relevan untuk status saat ini, urut sesuai tampilan.
export function getPrimaryActions(status: OrderStatus, payment: PaymentStatus): OrderAction[] {
  switch (status) {
    case "menunggu_konfirmasi":
      return ["konfirmasi", "batalkan"];
    case "dikonfirmasi":
      return ["siapkan"];
    case "disiapkan":
      return ["siap"];
    case "siap_diambil":
      return payment === "lunas" ? ["selesai"] : ["lunas", "selesai"];
    default:
      return [];
  }
}

// Pembatalan di luar menunggu_konfirmasi (misal customer tidak datang) tetap
// boleh, tapi ditampilkan sebagai tautan kecil di halaman detail saja.
export function canCancelLater(status: OrderStatus) {
  return status === "dikonfirmasi" || status === "disiapkan" || status === "siap_diambil";
}
