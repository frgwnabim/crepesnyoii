import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CopyCodeButton } from "@/components/pesanan/CopyCodeButton";
import { LiveOrderUpdates } from "@/components/pesanan/LiveOrderUpdates";
import { OrderQrCode } from "@/components/pesanan/OrderQrCode";
import { StatusTimeline } from "@/components/pesanan/StatusTimeline";
import { formatRupiah, formatSlotTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { OrderDetail, OrderStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Status pesanan",
};

const HEADLINE: Record<OrderStatus, { title: string; subtitle: string }> = {
  menunggu_konfirmasi: {
    title: "Yay, crepe-mu diamankan!",
    subtitle: "Pesananmu sudah masuk dan lagi menunggu dikonfirmasi tim booth.",
  },
  dikonfirmasi: {
    title: "Pesananmu dikonfirmasi!",
    subtitle: "Tim booth sudah terima pesananmu. Tinggal tunggu dibuat ya.",
  },
  disiapkan: {
    title: "Crepe-mu lagi dibuat",
    subtitle: "Sabar sebentar, crepe-mu lagi digulung dengan penuh cinta.",
  },
  siap_diambil: {
    title: "Crepe-mu siap diambil!",
    subtitle: "Langsung ke booth, sebutkan kodenya, lalu bayar di kasir.",
  },
  selesai: {
    title: "Selamat menikmati!",
    subtitle: "Terima kasih sudah jajan di Crepe Roll Nyoii.",
  },
  dibatalkan: {
    title: "Pesanan dibatalkan",
    subtitle: "Maaf ya, pesanan ini tidak bisa kami proses.",
  },
};

export default function PesananPage({ params }: PageProps<"/pesanan/[code]">) {
  return (
    <>
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-5 py-4">
        <Link href="/" className="text-lg font-extrabold text-cocoa">
          Crepe Roll Nyoii
        </Link>
        <Link href="/cek" className="text-sm font-semibold text-pink-dark">
          Cek pesanan lain
        </Link>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-12">
        <Suspense fallback={<OrderSkeleton />}>
          <OrderView params={params} />
        </Suspense>
      </main>
    </>
  );
}

async function OrderView({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_order_by_code", {
    p_code: decodeURIComponent(code),
  });

  if (error) {
    return (
      <Notice
        title="Yah, pesanan gagal dimuat"
        body="Coba muat ulang halaman ini ya."
      />
    );
  }

  if (!data) {
    return (
      <Notice
        title="Pesanan tidak ditemukan"
        body="Coba cek lagi kodenya ya. Formatnya NYO-XXXX."
        action={{ href: "/cek", label: "Cek kode lagi" }}
      />
    );
  }

  const order = data as OrderDetail;
  const headline = HEADLINE[order.status];
  const cancelled = order.status === "dibatalkan";

  return (
    <div className="flex flex-col gap-4">
      <section className="text-center">
        <h1 className="text-2xl font-extrabold text-cocoa">{headline.title}</h1>
        <p className="mt-1 text-sm text-cocoa/70">{headline.subtitle}</p>
      </section>

      <section className="flex flex-col items-center rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-cocoa/55">
          Kode pesanan
        </p>
        <p className="mt-1 font-mono text-3xl font-extrabold tracking-[0.12em] text-cocoa min-[400px]:text-4xl min-[400px]:tracking-[0.15em]">
          {order.code}
        </p>
        <div className={`mt-4 ${cancelled ? "opacity-30 grayscale" : ""}`}>
          <OrderQrCode code={order.code} />
        </div>
        <CopyCodeButton code={order.code} />
      </section>

      {!cancelled && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
          📌 Simpan kode ini. Sebutkan kode, bukan nama, saat mengambil pesanan.
        </p>
      )}

      <LiveOrderUpdates
        code={order.code}
        status={order.status}
        paymentStatus={order.payment_status}
      />

      {cancelled ? (
        <section
          role="alert"
          className="rounded-3xl bg-red-50 p-5 text-red-800 ring-1 ring-red-200"
        >
          <p className="font-bold">Pesanan ini dibatalkan</p>
          <p className="mt-1 text-sm">
            {order.cancel_reason
              ? `Alasan: ${order.cancel_reason}`
              : "Untuk info lebih lanjut, tanya langsung ke kasir booth ya."}
          </p>
        </section>
      ) : (
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-cocoa">Status pesanan</h2>
          <StatusTimeline status={order.status} />
        </section>
      )}

      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <dl className="flex flex-col gap-2 text-sm text-cocoa">
          <InfoRow label="Nama pengambil" value={order.customer_name} />
          <InfoRow label="Jam ambil" value={formatSlotTime(order.pickup_slot.slot_time)} />
          <div className="flex justify-between gap-3">
            <dt className="text-cocoa/60">Pembayaran</dt>
            <dd>
              {order.payment_status === "lunas" ? (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                  Lunas
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                  Bayar di kasir
                </span>
              )}
            </dd>
          </div>
        </dl>

        <ul className="mt-4 flex flex-col gap-2 border-t border-dashed border-cocoa/15 pt-4">
          {order.items.map((item) => (
            <li key={item.product_id} className="flex justify-between gap-3 text-sm text-cocoa">
              <span>
                {item.quantity}x {item.product_name}
              </span>
              <span className="tabular-nums">
                {formatRupiah(item.quantity * item.price_at_order)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between text-cocoa">
          <span className="font-bold">Total</span>
          <span className="text-lg font-extrabold tabular-nums">
            {formatRupiah(order.total_price)}
          </span>
        </div>
      </section>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-cocoa/60">{label}</dt>
      <dd className="text-right font-semibold break-words">{value}</dd>
    </div>
  );
}

function Notice({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mt-6 rounded-3xl bg-white p-6 text-center shadow-sm">
      <p className="text-4xl" aria-hidden>
        🥞
      </p>
      <p className="mt-3 font-bold text-cocoa">{title}</p>
      <p className="mt-1 text-sm text-cocoa/65">{body}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-pink px-5 text-sm font-bold text-white shadow-md hover:bg-pink-dark"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

function OrderSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <div className="mx-auto h-7 w-2/3 animate-pulse rounded bg-cocoa/10" />
      <div className="h-80 animate-pulse rounded-3xl bg-white shadow-sm" />
      <div className="h-48 animate-pulse rounded-3xl bg-white shadow-sm" />
    </div>
  );
}
