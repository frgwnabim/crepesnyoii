import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OrdersDashboard, type AdminOrderRow } from "@/components/admin/OrdersDashboard";
import { getAdminUser } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pesanan hari ini",
};

const BOOTH_TZ = "Asia/Jakarta";

// "2026-10-08T00:00:00+07:00": awal hari ini menurut jam booth (WIB).
function startOfTodayWib() {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOOTH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return `${ymd}T00:00:00+07:00`;
}

function orderDateLabel(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: BOOTH_TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function todayLabel() {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: BOOTH_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export default function AdminDashboardPage() {
  return (
    <main className="px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <Suspense fallback={<DashboardSkeleton />}>
        <TodayOrders />
      </Suspense>
    </main>
  );
}

async function TodayOrders() {
  await getAdminUser();
  const supabase = await createClient();
  const todayStart = startOfTodayWib();

  // Pesanan hari sebelumnya yang belum dikonfirmasi tetap dihitung di badge
  // sidebar, jadi tampilkan di sini supaya tidak tertinggal diam-diam.
  const [{ data, error }, { data: stale }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        `id, code, customer_name, status, payment_status, total_price, created_at,
         pickup_slot:pickup_slots ( id, slot_time ),
         order_items ( quantity, product:products ( name ) )`,
      )
      .gte("created_at", todayStart),
    supabase
      .from("orders")
      .select("id, code, customer_name, created_at")
      .eq("status", "menunggu_konfirmasi")
      .lt("created_at", todayStart)
      .order("created_at"),
  ]);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Pesanan hari ini</h1>
        <p className="text-sm text-slate-500">{todayLabel()}</p>
      </header>
      {stale && stale.length > 0 && <StaleOrdersNotice orders={stale} />}
      {error ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
          Gagal memuat pesanan: {error.message}
        </p>
      ) : (
        <OrdersDashboard orders={(data ?? []) as unknown as AdminOrderRow[]} />
      )}
    </>
  );
}

type StaleOrder = { id: string; code: string; customer_name: string; created_at: string };

function StaleOrdersNotice({ orders }: { orders: StaleOrder[] }) {
  return (
    <section className="mb-6 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
      <h2 className="text-sm font-semibold text-amber-900">
        Ada {orders.length} pesanan dari hari sebelumnya yang belum diproses
      </h2>
      <p className="mt-1 text-sm text-amber-800">
        Konfirmasi atau batalkan supaya angka di menu Pesanan sesuai.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {orders.map((order) => (
          <li key={order.id}>
            <Link
              href={`/admin/pesanan/${order.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100"
            >
              <span className="font-semibold">{order.code}</span>
              <span>{order.customer_name}</span>
              <span className="text-amber-700">{orderDateLabel(order.created_at)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy>
      <div className="mb-6 h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-white" />
        ))}
      </div>
      <div className="mt-6 h-96 animate-pulse rounded-xl bg-white" />
    </div>
  );
}
