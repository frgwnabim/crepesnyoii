"use client";

import Link from "next/link";

// Error tak terduga di halaman customer.
export default function CustomerError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-16 text-center">
      <p className="text-6xl" aria-hidden>
        😵
      </p>
      <h1 className="mt-4 text-2xl font-extrabold text-cocoa">Ups, ada yang gosong</h1>
      <p className="mt-2 text-sm leading-relaxed text-cocoa/70">
        Halaman ini gagal dimuat. Coba lagi sebentar, atau langsung antre di booth ya.
      </p>
      <div className="mt-8 flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={reset}
          className="flex h-12 w-full items-center justify-center rounded-full bg-pink font-bold text-white shadow-md hover:bg-pink-dark"
        >
          Coba lagi
        </button>
        <Link
          href="/"
          className="flex h-12 w-full items-center justify-center rounded-full bg-white font-bold text-cocoa ring-1 ring-cocoa/15 hover:bg-[#FFEBD6]"
        >
          Kembali ke beranda
        </Link>
      </div>
    </main>
  );
}
