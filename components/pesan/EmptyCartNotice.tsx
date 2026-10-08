import Link from "next/link";

export function EmptyCartNotice() {
  return (
    <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
      <p className="text-4xl" aria-hidden>
        🥞
      </p>
      <p className="mt-3 font-bold text-cocoa">Keranjangmu masih kosong</p>
      <p className="mt-1 text-sm text-cocoa/65">Pilih crepe-nya dulu, baru atur jam ambil.</p>
      <Link
        href="/pesan"
        className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-pink px-5 text-sm font-bold text-white shadow-md hover:bg-pink-dark"
      >
        Pilih crepe
      </Link>
    </div>
  );
}
