import { Suspense } from "react";
import { OrdersDashboard, type AdminOrderRow } from "@/components/admin/OrdersDashboard";
import { getAdminUser } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

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
    <main className="px-8 py-8">
      <Suspense fallback={<DashboardSkeleton />}>
        <TodayOrders />
      </Suspense>
    </main>
  );
}

async function TodayOrders() {
  await getAdminUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, code, customer_name, status, payment_status, total_price, created_at,
       pickup_slot:pickup_slots ( id, slot_time ),
       order_items ( quantity, product:products ( name ) )`,
    )
    .gte("created_at", startOfTodayWib());

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Pesanan hari ini</h1>
        <p className="text-sm text-slate-500">{todayLabel()}</p>
      </header>
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

function DashboardSkeleton() {
  return (
    <div aria-busy>
      <div className="mb-6 h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-white" />
        ))}
      </div>
      <div className="mt-6 h-96 animate-pulse rounded-xl bg-white" />
    </div>
  );
}
