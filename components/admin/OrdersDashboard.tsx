"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ORDER_STATUSES,
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_BADGE,
  PAYMENT_STATUS_LABEL,
} from "@/lib/admin/status";
import { formatRupiah, formatSlotTime } from "@/lib/format";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

export type AdminOrderRow = {
  id: string;
  code: string;
  customer_name: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total_price: number;
  created_at: string;
  pickup_slot: { id: string; slot_time: string } | null;
  order_items: { quantity: number; product: { name: string } | null }[];
};

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
});

// Default: jam ambil terdekat dulu, lalu yang masuk lebih awal.
function compareOrders(a: AdminOrderRow, b: AdminOrderRow) {
  const slotA = a.pickup_slot?.slot_time ?? "99:99";
  const slotB = b.pickup_slot?.slot_time ?? "99:99";
  if (slotA !== slotB) return slotA < slotB ? -1 : 1;
  return a.created_at.localeCompare(b.created_at);
}

export function OrdersDashboard({ orders }: { orders: AdminOrderRow[] }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "semua">("semua");
  const [slotFilter, setSlotFilter] = useState<string>("semua");

  const counts = useMemo(() => {
    const by = (s: OrderStatus) => orders.filter((o) => o.status === s).length;
    return {
      total: orders.filter((o) => o.status !== "dibatalkan").length,
      cancelled: by("dibatalkan"),
      waiting: by("menunggu_konfirmasi"),
      preparing: by("disiapkan"),
      ready: by("siap_diambil"),
    };
  }, [orders]);

  const slotOptions = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => {
      if (o.pickup_slot) map.set(o.pickup_slot.id, o.pickup_slot.slot_time);
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [orders]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders
      .filter((o) => statusFilter === "semua" || o.status === statusFilter)
      .filter((o) => slotFilter === "semua" || o.pickup_slot?.id === slotFilter)
      .filter(
        (o) =>
          !q ||
          o.code.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q),
      )
      .sort(compareOrders);
  }, [orders, query, statusFilter, slotFilter]);

  const filtersActive = query !== "" || statusFilter !== "semua" || slotFilter !== "semua";

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-4 gap-4">
        <SummaryCard
          label="Total order"
          value={counts.total}
          note={counts.cancelled > 0 ? `${counts.cancelled} dibatalkan tidak dihitung` : undefined}
          onClick={() => setStatusFilter("semua")}
        />
        <SummaryCard
          label="Perlu konfirmasi"
          value={counts.waiting}
          tone={counts.waiting > 0 ? "danger" : "default"}
          onClick={() => setStatusFilter("menunggu_konfirmasi")}
        />
        <SummaryCard
          label="Sedang disiapkan"
          value={counts.preparing}
          onClick={() => setStatusFilter("disiapkan")}
        />
        <SummaryCard
          label="Siap diambil"
          value={counts.ready}
          onClick={() => setStatusFilter("siap_diambil")}
        />
      </section>

      <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kode atau nama..."
            aria-label="Cari kode atau nama"
            className="h-10 w-72 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "semua")}
            aria-label="Filter status"
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="semua">Semua status</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            value={slotFilter}
            onChange={(e) => setSlotFilter(e.target.value)}
            aria-label="Filter jam ambil"
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="semua">Semua jam</option>
            {slotOptions.map(([id, time]) => (
              <option key={id} value={id}>
                {formatSlotTime(time)}
              </option>
            ))}
          </select>
          {filtersActive && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatusFilter("semua");
                setSlotFilter("semua");
              }}
              className="text-sm font-semibold text-slate-500 hover:text-slate-900"
            >
              Reset filter
            </button>
          )}
          <button
            type="button"
            onClick={() => startRefresh(() => router.refresh())}
            disabled={refreshing}
            className="ml-auto h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {refreshing ? "Memuat..." : "Muat ulang"}
          </button>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Kode & nama</th>
              <th className="px-4 py-3 font-semibold">Item</th>
              <th className="px-4 py-3 font-semibold">Jam ambil</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Bayar</th>
              <th className="px-4 py-3 font-semibold">Masuk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  {orders.length === 0
                    ? "Belum ada pesanan hari ini."
                    : "Tidak ada pesanan yang cocok dengan filter."}
                </td>
              </tr>
            ) : (
              visible.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => router.push(`/admin/pesanan/${o.id}`)}
                  className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                    o.status === "dibatalkan" ? "text-slate-400" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/pesanan/${o.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-mono font-bold text-slate-900 hover:underline"
                    >
                      {o.code}
                    </Link>
                    <p className="text-slate-500">{o.customer_name}</p>
                  </td>
                  <td className="px-4 py-3">
                    {o.order_items.map((item, i) => (
                      <p key={i}>
                        {item.quantity}x {item.product?.name ?? "?"}
                      </p>
                    ))}
                    <p className="text-xs text-slate-400">{formatRupiah(o.total_price)}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {o.pickup_slot ? formatSlotTime(o.pickup_slot.slot_time) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={ORDER_STATUS_BADGE[o.status]}>
                      {ORDER_STATUS_LABEL[o.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={PAYMENT_STATUS_BADGE[o.payment_status]}>
                      {PAYMENT_STATUS_LABEL[o.payment_status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-500">
                    {timeFormatter.format(new Date(o.created_at))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  note,
  tone = "default",
  onClick,
}: {
  label: string;
  value: number;
  note?: string;
  tone?: "default" | "danger";
  onClick: () => void;
}) {
  const danger = tone === "danger";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl p-5 text-left shadow-sm ring-1 transition-colors ${
        danger
          ? "bg-red-50 ring-red-200 hover:bg-red-100"
          : "bg-white ring-slate-200 hover:bg-slate-50"
      }`}
    >
      <p className={`text-sm font-semibold ${danger ? "text-red-700" : "text-slate-500"}`}>
        {label}
      </p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${danger ? "text-red-700" : "text-slate-900"}`}>
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
    </button>
  );
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}
