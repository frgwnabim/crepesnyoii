"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { EmptyCartNotice } from "@/components/pesan/EmptyCartNotice";
import { getDeviceId } from "@/lib/device-id";
import { formatRupiah, formatSlotTime } from "@/lib/format";
import { saveRecentOrder } from "@/lib/recent-orders";
import { createClient } from "@/lib/supabase/client";

const NAME_MIN = 2;
const NAME_MAX = 30;
const NOTE_MAX = 100;

type FriendlyError = {
  message: string;
  action?: { href: string; label: string };
};

type RpcError = { message?: string; code?: string; hint?: string };

// Terjemahkan error dari RPC create_order (lihat HINT di migration) ke pesan ramah.
function toFriendlyError(error: RpcError): FriendlyError {
  let hint = error.hint;
  // Cadangan kalau yang menolak adalah trigger tabel (race condition), bukan RPC.
  if (!hint && error.message?.includes("sudah penuh")) hint = "SLOT_FULL";
  if (!hint && error.message?.includes("Maksimal 2 crepe")) hint = "MAX_QTY";

  switch (hint) {
    case "RATE_LIMITED":
      return {
        message:
          "Kamu sudah bikin cukup banyak pesanan dalam sejam terakhir. Kalau mau pesan lagi, antre langsung di booth ya!",
      };
    case "INVALID_DEVICE":
      return { message: "Ada yang aneh dengan browser-mu. Muat ulang halaman lalu coba lagi ya." };
    case "SLOT_FULL":
      return {
        message: "Yah, jam ambil ini keburu penuh. Pilih jam lain yuk!",
        action: { href: "/pesan/jam", label: "Pilih jam lain" },
      };
    case "SLOT_PAST":
      return {
        message: "Jam ambil yang kamu pilih sudah lewat. Pilih jam lain yuk!",
        action: { href: "/pesan/jam", label: "Pilih jam lain" },
      };
    case "SLOT_NOT_FOUND":
      return {
        message: "Jam ambil ini sudah tidak dibuka. Pilih jam lain yuk!",
        action: { href: "/pesan/jam", label: "Pilih jam lain" },
      };
    case "PRODUCT_UNAVAILABLE":
      return {
        message: "Ada crepe di keranjangmu yang barusan habis. Ganti pilihan dulu ya.",
        action: { href: "/pesan", label: "Ubah pilihan crepe" },
      };
    case "MAX_QTY":
      return {
        message: "Maksimal 2 crepe per pesanan. Mau lebih? Antre langsung di booth ya!",
        action: { href: "/pesan", label: "Ubah pilihan crepe" },
      };
    case "EMPTY_ITEMS":
    case "INVALID_ITEMS":
      return {
        message: "Keranjangmu sepertinya bermasalah. Coba pilih crepe lagi ya.",
        action: { href: "/pesan", label: "Pilih crepe" },
      };
    case "INVALID_NAME":
      return { message: `Nama pengambil harus ${NAME_MIN} sampai ${NAME_MAX} karakter.` };
    case "INVALID_NOTE":
      return { message: `Catatan maksimal ${NOTE_MAX} karakter.` };
    default:
      return {
        message: "Pesanan gagal dikirim. Cek koneksi internetmu lalu coba lagi ya.",
      };
  }
}

export function OrderForm() {
  const router = useRouter();
  const { items, totalQuantity, totalPrice, pickupSlot, clear } = useCart();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<FriendlyError | null>(null);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

  // Halaman bisa tetap "hidden" setelah redirect, jadi tampilkan tautan ke pesanan
  // yang barusan dikirim alih-alih pesan keranjang kosong.
  if (submittedCode && totalQuantity === 0) {
    return (
      <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
        <p className="font-bold text-cocoa">Pesanan {submittedCode} sudah terkirim!</p>
        <Link
          href={`/pesanan/${submittedCode}`}
          className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-pink px-5 text-sm font-bold text-white shadow-md hover:bg-pink-dark"
        >
          Lihat status pesanan
        </Link>
      </div>
    );
  }

  if (totalQuantity === 0) {
    return <EmptyCartNotice />;
  }

  if (!pickupSlot) {
    return (
      <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
        <p className="font-bold text-cocoa">Jam ambilnya belum dipilih</p>
        <p className="mt-1 text-sm text-cocoa/65">Pilih jam dulu biar crepe-mu siap tepat waktu.</p>
        <Link
          href="/pesan/jam"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-pink px-5 text-sm font-bold text-white shadow-md hover:bg-pink-dark"
        >
          Pilih jam ambil
        </Link>
      </div>
    );
  }

  const trimmedName = name.trim();
  const nameValid = trimmedName.length >= NAME_MIN && trimmedName.length <= NAME_MAX;
  const showNameError = nameTouched && !nameValid;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNameTouched(true);
    if (!nameValid || submitting || !pickupSlot) return;

    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("create_order", {
        customer_name: trimmedName,
        pickup_slot_id: pickupSlot.id,
        items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        note: note.trim() || null,
        device_id: getDeviceId(),
      });

      if (rpcError || !data?.code) {
        setError(toFriendlyError(rpcError ?? {}));
        setSubmitting(false);
        return;
      }

      const code = data.code as string;
      saveRecentOrder(code);
      setSubmittedCode(code);
      router.replace(`/pesanan/${code}`);
      clear();
    } catch {
      setError(toFriendlyError({}));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <label htmlFor="customer-name" className="block text-sm font-bold text-cocoa">
          Nama pengambil <span className="text-pink-dark">*</span>
        </label>
        <input
          id="customer-name"
          type="text"
          autoComplete="given-name"
          required
          maxLength={NAME_MAX}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setNameTouched(true)}
          aria-invalid={showNameError}
          aria-describedby="customer-name-help"
          placeholder="Contoh: Nadia"
          className={`mt-2 h-12 w-full rounded-2xl bg-cream px-4 text-base text-cocoa outline-none ring-2 placeholder:text-cocoa/35 focus:ring-pink ${
            showNameError ? "ring-red-400" : "ring-transparent"
          }`}
        />
        <p
          id="customer-name-help"
          className={`mt-1.5 text-xs ${showNameError ? "text-red-500" : "text-cocoa/55"}`}
        >
          {showNameError
            ? `Isi nama ${NAME_MIN} sampai ${NAME_MAX} karakter ya.`
            : "Dipanggil pakai nama ini waktu pesanan siap."}
        </p>

        <label htmlFor="order-note" className="mt-5 block text-sm font-bold text-cocoa">
          Catatan <span className="font-normal text-cocoa/50">(opsional)</span>
        </label>
        <textarea
          id="order-note"
          rows={2}
          maxLength={NOTE_MAX}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Misal: topping dipisah"
          className="mt-2 w-full resize-none rounded-2xl bg-cream px-4 py-3 text-base text-cocoa outline-none ring-2 ring-transparent placeholder:text-cocoa/35 focus:ring-pink"
        />
        <p className="mt-1 text-right text-xs text-cocoa/45 tabular-nums">
          {note.length}/{NOTE_MAX}
        </p>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-cocoa">Ringkasan pesanan</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((i) => (
            <li key={i.product.id} className="flex justify-between gap-3 text-sm text-cocoa">
              <span>
                {i.quantity}x {i.product.name}
              </span>
              <span className="tabular-nums">{formatRupiah(i.quantity * i.product.price)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-dashed border-cocoa/15 pt-3 text-sm text-cocoa">
          <span>Jam ambil</span>
          <span className="font-bold tabular-nums">{formatSlotTime(pickupSlot.slot_time)}</span>
        </div>
        <div className="mt-2 flex justify-between text-cocoa">
          <span className="font-bold">Total</span>
          <span className="text-lg font-extrabold tabular-nums">{formatRupiah(totalPrice)}</span>
        </div>
      </section>

      <p className="rounded-2xl bg-pink/15 px-4 py-3 text-center text-sm font-semibold text-cocoa">
        💳 Pembayaran dilakukan di kasir saat pengambilan.
      </p>

      {error && (
        <div role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          <p>{error.message}</p>
          {error.action && (
            <Link href={error.action.href} className="mt-2 inline-block font-bold underline">
              {error.action.label}
            </Link>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex h-14 w-full items-center justify-center rounded-full bg-pink text-lg font-bold text-white shadow-md transition-colors hover:bg-pink-dark disabled:cursor-wait disabled:opacity-70"
      >
        {submitting ? "Mengirim..." : "Kirim Pesanan"}
      </button>
    </form>
  );
}
