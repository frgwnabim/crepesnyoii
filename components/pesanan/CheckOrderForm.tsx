"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ORDER_CODE_PATTERN, normalizeOrderCode } from "@/lib/order-code";
import { createClient } from "@/lib/supabase/client";

export function CheckOrderForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (searching) return;

    if (!ORDER_CODE_PATTERN.test(code)) {
      setError(
        "Format kode belum pas. Contoh: NYO-4K7P (huruf dan angka, tanpa 0, O, 1, atau I).",
      );
      return;
    }

    setSearching(true);
    setError(null);
    try {
      const { data, error: rpcError } = await createClient().rpc("get_order_by_code", {
        p_code: code,
      });
      if (rpcError) throw rpcError;
      if (!data) {
        setError("Kode ini tidak ditemukan. Cek lagi ketikannya ya.");
        setSearching(false);
        return;
      }
      router.push(`/pesanan/${code}`);
    } catch {
      setError("Gagal mencari pesanan. Cek koneksi internetmu lalu coba lagi ya.");
      setSearching(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-3xl bg-white p-5 shadow-sm">
      <label htmlFor="order-code" className="block text-sm font-bold text-cocoa">
        Kode pesanan
      </label>
      <input
        id="order-code"
        type="text"
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        maxLength={12}
        value={code}
        onChange={(e) => {
          setCode(normalizeOrderCode(e.target.value));
          setError(null);
        }}
        placeholder="NYO-XXXX"
        aria-invalid={!!error}
        aria-describedby="order-code-help"
        className={`mt-2 h-14 w-full rounded-2xl bg-cream px-4 text-center font-mono text-2xl font-extrabold tracking-[0.15em] text-cocoa uppercase outline-none ring-2 placeholder:text-cocoa/25 focus:ring-pink ${
          error ? "ring-red-400" : "ring-transparent"
        }`}
      />
      <p
        id="order-code-help"
        role={error ? "alert" : undefined}
        className={`mt-2 text-xs ${error ? "text-red-600" : "text-cocoa/55"}`}
      >
        {error ?? "Kodenya ada di halaman pesananmu, formatnya NYO-XXXX."}
      </p>
      <button
        type="submit"
        disabled={searching}
        className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-pink text-base font-bold text-white shadow-md transition-colors hover:bg-pink-dark disabled:cursor-wait disabled:opacity-70"
      >
        {searching ? "Mencari..." : "Cari pesanan"}
      </button>
    </form>
  );
}
