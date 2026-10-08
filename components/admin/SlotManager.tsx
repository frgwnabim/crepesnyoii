"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  setAllSlotsActive,
  setSlotActive,
  updateSlotCapacity,
} from "@/app/admin/(panel)/slot/actions";
import { formatSlotTime } from "@/lib/format";

export type AdminSlotRow = {
  id: string;
  slot_time: string;
  max_orders: number;
  is_active: boolean;
  used_count: number;
};

export function SlotManager({ slots }: { slots: AdminSlotRow[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const activeCount = slots.filter((s) => s.is_active).length;
  const closed = slots.length > 0 && activeCount === 0;

  function setAll(open: boolean) {
    const ok = open
      ? window.confirm("Buka lagi SEMUA slot untuk pemesanan web?")
      : window.confirm(
          "Tutup pemesanan web? Semua slot akan dinonaktifkan dan customer diarahkan antre langsung di booth.",
        );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const result = await setAllSlotsActive(open);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section
        className={`flex flex-wrap items-center justify-between gap-4 rounded-xl p-5 ring-1 ${
          closed ? "bg-red-50 ring-red-200" : "bg-white shadow-sm ring-slate-200"
        }`}
      >
        <div>
          <p className={`font-bold ${closed ? "text-red-800" : "text-slate-900"}`}>
            {closed ? "Pemesanan web sedang DITUTUP" : "Pemesanan web dibuka"}
          </p>
          <p className={`text-sm ${closed ? "text-red-700" : "text-slate-500"}`}>
            {closed
              ? "Landing page customer menampilkan ajakan antre langsung di booth."
              : `${activeCount} dari ${slots.length} slot aktif.`}
          </p>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
        {closed ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setAll(true)}
            className="h-11 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {pending ? "Membuka..." : "Buka semua slot"}
          </button>
        ) : (
          <button
            type="button"
            disabled={pending || slots.length === 0}
            onClick={() => setAll(false)}
            className="h-11 rounded-lg bg-red-600 px-5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-60"
          >
            {pending ? "Menutup..." : "Tutup pemesanan web"}
          </button>
        )}
      </section>

      <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Jam ambil</th>
                <th className="px-4 py-3 font-semibold">Terisi / kuota</th>
                <th className="px-4 py-3 font-semibold">Kuota</th>
                <th className="px-4 py-3 font-semibold">Aktif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {slots.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                    Belum ada slot. Tambahkan lewat seed / SQL Editor Supabase.
                  </td>
                </tr>
              ) : (
                slots.map((slot) => <SlotRow key={slot.id} slot={slot} />)
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SlotRow({ slot }: { slot: AdminSlotRow }) {
  const [pending, startTransition] = useTransition();
  const [active, setOptimisticActive] = useOptimistic(slot.is_active);
  const [capacity, setCapacity] = useState(String(slot.max_orders));
  const [error, setError] = useState<string | null>(null);

  const capacityNumber = Number(capacity);
  const dirty = capacity !== "" && capacityNumber !== slot.max_orders;
  const full = slot.used_count >= slot.max_orders;
  const percent = slot.max_orders > 0 ? Math.min(100, (slot.used_count / slot.max_orders) * 100) : 100;

  function saveCapacity() {
    setError(null);
    startTransition(async () => {
      const result = await updateSlotCapacity(slot.id, capacityNumber);
      if (!result.ok) setError(result.error);
    });
  }

  function toggleActive() {
    const next = !active;
    setError(null);
    startTransition(async () => {
      setOptimisticActive(next);
      const result = await setSlotActive(slot.id, next);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <tr className={active ? "" : "bg-slate-50/60 text-slate-400"}>
      <td className="px-4 py-3 text-base font-bold tabular-nums">
        {formatSlotTime(slot.slot_time)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={`w-14 font-semibold tabular-nums ${full ? "text-red-600" : ""}`}>
            {slot.used_count} / {slot.max_orders}
          </span>
          <div className="hidden h-2 w-24 overflow-hidden rounded-full bg-slate-100 md:block lg:w-32">
            <div
              className={`h-full rounded-full ${
                full ? "bg-red-500" : percent >= 70 ? "bg-amber-400" : "bg-emerald-500"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          {full && <span className="text-xs font-semibold text-red-600">Penuh</span>}
        </div>
      </td>
      <td className="px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (dirty) saveCapacity();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            inputMode="numeric"
            aria-label={`Kuota slot ${formatSlotTime(slot.slot_time)}`}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value.replace(/\D/g, "").slice(0, 3))}
            className="h-9 w-20 rounded-lg border border-slate-300 px-3 text-sm tabular-nums text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
          />
          {dirty && (
            <>
              <button
                type="submit"
                disabled={pending}
                className="h-9 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
              >
                {pending ? "..." : "Simpan"}
              </button>
              <button
                type="button"
                onClick={() => setCapacity(String(slot.max_orders))}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                Batal
              </button>
            </>
          )}
        </form>
        {dirty && capacityNumber < slot.used_count && (
          <p className="mt-1 text-xs text-amber-700">
            Di bawah jumlah terisi: pesanan lama aman, slot jadi penuh.
          </p>
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label={`Slot ${formatSlotTime(slot.slot_time)} aktif`}
          disabled={pending}
          onClick={toggleActive}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            active ? "bg-emerald-500" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              active ? "left-5.5" : "left-0.5"
            }`}
          />
        </button>
      </td>
    </tr>
  );
}
