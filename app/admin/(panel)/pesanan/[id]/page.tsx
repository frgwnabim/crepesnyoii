import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminStatusStepper } from "@/components/admin/AdminStatusStepper";
import { OrderActions } from "@/components/admin/OrderActions";
import { getAdminUser } from "@/lib/admin/auth";
import {
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_BADGE,
  PAYMENT_STATUS_LABEL,
} from "@/lib/admin/status";
import { formatRupiah, formatSlotTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Detail pesanan",
};

type OrderEvent = {
  id: string;
  event_type: string;
  message: string | null;
  actor: "sistem" | "admin";
  actor_name: string | null;
  created_at: string;
};

type AdminOrderDetail = {
  id: string;
  code: string;
  customer_name: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total_price: number;
  note: string | null;
  created_at: string;
  pickup_slot: { id: string; slot_time: string } | null;
  order_items: {
    id: string;
    quantity: number;
    price_at_order: number;
    product: { name: string } | null;
  }[];
  order_events: OrderEvent[];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
});

const formatTime = (iso: string) => timeFormatter.format(new Date(iso));

const EVENT_LABEL: Record<string, string> = {
  dibuat: "Pesanan masuk",
  dikonfirmasi: "Dikonfirmasi",
  disiapkan: "Mulai disiapkan",
  siap_diambil: "Siap diambil",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
  lunas: "Lunas",
};

const EVENT_DOT: Record<string, string> = {
  dibuat: "bg-slate-400",
  dikonfirmasi: "bg-lime-500",
  disiapkan: "bg-yellow-400",
  siap_diambil: "bg-pink-500",
  selesai: "bg-emerald-500",
  dibatalkan: "bg-red-500",
  lunas: "bg-amber-500",
};

export default function AdminOrderDetailPage({ params }: PageProps<"/admin/pesanan/[id]">) {
  return (
    <main className="px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <Link href="/admin" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
        ← Semua pesanan
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <OrderDetail params={params} />
      </Suspense>
    </main>
  );
}

async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  await getAdminUser();
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) return <NotFound />;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, code, customer_name, status, payment_status, total_price, note, created_at,
       pickup_slot:pickup_slots ( id, slot_time ),
       order_items ( id, quantity, price_at_order, product:products ( name ) ),
       order_events ( id, event_type, message, actor, actor_name, created_at )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
        Gagal memuat pesanan: {error.message}
      </p>
    );
  }
  if (!data) return <NotFound />;

  const order = data as unknown as AdminOrderDetail;
  const events = [...order.order_events].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  const lastAdminEvent = events.find((e) => e.actor === "admin");
  const cancelEvent = events.find((e) => e.event_type === "dibatalkan");
  const cancelled = order.status === "dibatalkan";

  return (
    <div className="mt-4 flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-4xl font-extrabold tracking-wider text-slate-900">
              {order.code}
            </h1>
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${ORDER_STATUS_BADGE[order.status]}`}
            >
              {ORDER_STATUS_LABEL[order.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Masuk {formatTime(order.created_at)}
            {lastAdminEvent &&
              `, diperbarui ${formatTime(lastAdminEvent.created_at)} oleh ${
                lastAdminEvent.actor_name ?? "admin"
              }`}
          </p>
        </div>
      </header>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        {cancelled ? (
          <div className="rounded-lg bg-red-50 p-4 text-red-800 ring-1 ring-red-200">
            <p className="font-bold">Pesanan dibatalkan</p>
            <p className="mt-1 text-sm">
              Alasan: {cancelEvent?.message ?? "tidak dicatat"}
              {cancelEvent?.actor_name && ` (oleh ${cancelEvent.actor_name})`}
            </p>
          </div>
        ) : (
          <AdminStatusStepper status={order.status} />
        )}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <OrderActions
            orderId={order.id}
            orderCode={order.code}
            status={order.status}
            paymentStatus={order.payment_status}
          />
          {(order.status === "selesai" || cancelled) && (
            <p className="text-sm text-slate-500">Tidak ada aksi lagi untuk pesanan ini.</p>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card title="Pelanggan dan pengambilan">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <Field label="Nama pengambil" value={order.customer_name} />
              <Field
                label="Jam ambil"
                value={order.pickup_slot ? formatSlotTime(order.pickup_slot.slot_time) : "-"}
              />
              <div>
                <dt className="text-slate-500">Status bayar</dt>
                <dd className="mt-1">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PAYMENT_STATUS_BADGE[order.payment_status]}`}
                  >
                    {PAYMENT_STATUS_LABEL[order.payment_status]}
                  </span>
                </dd>
              </div>
              <Field label="Catatan" value={order.note ?? "-"} />
            </dl>
          </Card>

          <Card title="Item pesanan">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="pb-2 font-semibold">Item</th>
                  <th className="pb-2 text-right font-semibold">Jumlah</th>
                  <th className="pb-2 text-right font-semibold">Harga</th>
                  <th className="pb-2 text-right font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.order_items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5 font-medium">{item.product?.name ?? "?"}</td>
                    <td className="py-2.5 text-right tabular-nums">{item.quantity}</td>
                    <td className="py-2.5 text-right tabular-nums">
                      {formatRupiah(item.price_at_order)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {formatRupiah(item.quantity * item.price_at_order)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td colSpan={3} className="pt-3 font-bold">
                    Total
                  </td>
                  <td className="pt-3 text-right text-lg font-bold tabular-nums">
                    {formatRupiah(order.total_price)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </Card>
        </div>

        <Card title="Aktivitas order">
          {events.length === 0 && <p className="text-sm text-slate-500">Belum ada aktivitas.</p>}
          <ol className="flex flex-col gap-4">
            {events.map((event) => (
              <li key={event.id} className="flex gap-3 text-sm">
                <span
                  aria-hidden
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${EVENT_DOT[event.event_type] ?? "bg-slate-300"}`}
                />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {EVENT_LABEL[event.event_type] ?? event.event_type}
                    <span className="ml-2 font-normal tabular-nums text-slate-400">
                      {formatTime(event.created_at)}
                    </span>
                  </p>
                  {event.message && <p className="break-words text-slate-600">{event.message}</p>}
                  <p className="text-xs text-slate-400">
                    {event.actor === "admin" ? `oleh ${event.actor_name ?? "admin"}` : "Sistem"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mt-6 rounded-xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
      <p className="font-bold text-slate-900">Pesanan tidak ditemukan</p>
      <Link href="/admin" className="mt-3 inline-block text-sm font-semibold text-slate-600 underline">
        Kembali ke daftar pesanan
      </Link>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mt-4 flex flex-col gap-6" aria-busy>
      <div className="h-10 w-72 animate-pulse rounded bg-slate-200" />
      <div className="h-40 animate-pulse rounded-xl bg-white" />
      <div className="h-64 animate-pulse rounded-xl bg-white" />
    </div>
  );
}
