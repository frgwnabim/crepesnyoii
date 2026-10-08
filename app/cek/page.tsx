import Link from "next/link";
import { CheckOrderForm } from "@/components/pesanan/CheckOrderForm";

export default function CekPesananPage() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-md items-center gap-3 px-5 py-4">
        <Link
          href="/"
          aria-label="Kembali"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-xl text-cocoa shadow-sm ring-1 ring-cocoa/10"
        >
          ‹
        </Link>
        <h1 className="text-lg font-extrabold text-cocoa">Cek pesanan</h1>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-12 pt-2">
        <CheckOrderForm />
      </main>
    </>
  );
}
