import Link from "next/link";
import { Suspense } from "react";
import { RecentOrders } from "@/components/RecentOrders";
import { WEB_ORDERING_CLOSED_MESSAGE } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-10 pt-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-lg font-extrabold text-cocoa">Crepe Roll Nyoii</span>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-cocoa shadow-sm ring-1 ring-cocoa/10">
          Buka 10.00 - 17.00
        </span>
      </header>

      <RecentOrders />

      {/* Placeholder foto hero, ganti dengan foto asli nanti */}
      <div
        role="img"
        aria-label="Foto crepe roll Nyoii"
        className="mt-6 flex aspect-[4/3] w-full flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-pink/40 via-[#FFD9C2] to-[#FFEBD6] shadow-sm"
      >
        <span className="text-7xl" aria-hidden>
          🥞
        </span>
        <span className="mt-2 text-xs font-medium text-cocoa/60">Foto segera hadir</span>
      </div>

      <section className="mt-8 text-center">
        <h1 className="text-3xl font-extrabold leading-tight text-cocoa">
          Crepe roll hangat, tinggal ambil!
        </h1>
        <p className="mt-3 text-base leading-relaxed text-cocoa/75">
          Pesan duluan dari sini, pilih jam ambilnya, terus bayar di kasir booth pas
          ambil. Nggak perlu nunggu lama.
        </p>
      </section>

      <div className="mt-auto pt-10">
        <Suspense fallback={<div className="h-14 w-full animate-pulse rounded-full bg-pink/30" />}>
          <OrderCallToAction />
        </Suspense>
        <p className="mt-2 text-center text-sm">
          <Link href="/cek" className="font-semibold text-pink-dark underline underline-offset-2">
            Sudah pesan? Cek pesananmu
          </Link>
        </p>
      </div>
    </main>
  );
}

// Pemesanan web dianggap ditutup kalau tidak ada slot aktif sama sekali
// (admin menekan "Tutup pemesanan web"). anon hanya bisa melihat slot aktif.
async function OrderCallToAction() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("pickup_slots").select("id").limit(1);
  const closed = !error && (data ?? []).length === 0;

  if (closed) {
    return (
      <div className="rounded-3xl bg-white p-5 text-center shadow-sm ring-2 ring-pink/40">
        <p className="text-3xl" aria-hidden>
          🙏
        </p>
        <p className="mt-2 font-bold text-cocoa">{WEB_ORDERING_CLOSED_MESSAGE}</p>
      </div>
    );
  }

  return (
    <>
      <Link
        href="/pesan"
        className="flex h-14 w-full items-center justify-center rounded-full bg-pink text-lg font-bold text-white shadow-md transition-colors hover:bg-pink-dark active:scale-[0.99]"
      >
        Pesan Sekarang
      </Link>
      <p className="mt-3 text-center text-sm text-cocoa/60">Antre langsung di booth juga bisa!</p>
    </>
  );
}
