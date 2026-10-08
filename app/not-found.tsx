import Link from "next/link";

export const metadata = {
  title: "Halaman tidak ditemukan",
};

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-16 text-center">
      <div
        aria-hidden
        className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-pink/40 to-[#FFE3CC] text-6xl shadow-sm"
      >
        🥞
      </div>
      <p className="mt-6 text-sm font-bold uppercase tracking-widest text-pink-dark">404</p>
      <h1 className="mt-1 text-2xl font-extrabold text-cocoa">
        Waduh, halaman ini nggak ada di menu
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-cocoa/70">
        Mungkin link-nya salah ketik, atau crepe-nya sudah keburu digulung. Yuk balik ke booth!
      </p>
      <div className="mt-8 flex w-full flex-col gap-3">
        <Link
          href="/"
          className="flex h-12 w-full items-center justify-center rounded-full bg-pink font-bold text-white shadow-md hover:bg-pink-dark"
        >
          Kembali ke beranda
        </Link>
        <Link
          href="/cek"
          className="flex h-12 w-full items-center justify-center rounded-full bg-white font-bold text-cocoa ring-1 ring-cocoa/15 hover:bg-[#FFEBD6]"
        >
          Cek pesanan pakai kode
        </Link>
      </div>
    </main>
  );
}
