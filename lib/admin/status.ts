import type { OrderStatus, PaymentStatus } from "@/lib/types";

export const ORDER_STATUSES: OrderStatus[] = [
  "menunggu_konfirmasi",
  "dikonfirmasi",
  "disiapkan",
  "siap_diambil",
  "selesai",
  "dibatalkan",
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  menunggu_konfirmasi: "Menunggu konfirmasi",
  dikonfirmasi: "Dikonfirmasi",
  disiapkan: "Disiapkan",
  siap_diambil: "Siap diambil",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  menunggu_konfirmasi: "bg-slate-200 text-slate-700",
  dikonfirmasi: "bg-lime-100 text-lime-800",
  disiapkan: "bg-yellow-100 text-yellow-800",
  siap_diambil: "bg-pink-100 text-pink-700",
  selesai: "bg-emerald-100 text-emerald-800",
  dibatalkan: "bg-red-100 text-red-700",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  belum_bayar: "Belum bayar",
  lunas: "Lunas",
};

export const PAYMENT_STATUS_BADGE: Record<PaymentStatus, string> = {
  belum_bayar: "bg-amber-100 text-amber-800",
  lunas: "bg-emerald-100 text-emerald-800",
};
