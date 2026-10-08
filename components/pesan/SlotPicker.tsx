"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { EmptyCartNotice } from "@/components/pesan/EmptyCartNotice";
import { formatSlotTime } from "@/lib/format";
import { WEB_ORDERING_CLOSED_MESSAGE } from "@/lib/messages";
import type { PickupSlot } from "@/lib/types";

// Sisa kuota segini atau kurang dianggap "Hampir penuh".
const ALMOST_FULL_THRESHOLD = 3;

type SlotState = "tersedia" | "hampir_penuh" | "penuh" | "lewat";

function getSlotState(slot: PickupSlot): SlotState {
  if (slot.is_past) return "lewat";
  if (slot.remaining <= 0) return "penuh";
  if (slot.remaining <= ALMOST_FULL_THRESHOLD) return "hampir_penuh";
  return "tersedia";
}

const STATE_LABEL: Record<SlotState, string> = {
  tersedia: "Tersedia",
  hampir_penuh: "Hampir penuh",
  penuh: "Penuh",
  lewat: "Sudah lewat",
};

const STATE_BADGE: Record<SlotState, string> = {
  tersedia: "bg-emerald-100 text-emerald-700",
  hampir_penuh: "bg-amber-100 text-amber-700",
  penuh: "bg-cocoa/10 text-cocoa/50",
  lewat: "bg-cocoa/10 text-cocoa/50",
};

export function SlotPicker({ slots }: { slots: PickupSlot[] }) {
  const { totalQuantity, pickupSlot, setPickupSlot } = useCart();

  if (totalQuantity === 0) {
    return <EmptyCartNotice />;
  }

  // Pakai data slot terbaru dari server. Kalau slot yang tadi dipilih sudah
  // penuh atau lewat, anggap belum memilih.
  const selected = slots.find((s) => s.id === pickupSlot?.id);
  const selectedValid =
    selected && (getSlotState(selected) === "tersedia" || getSlotState(selected) === "hampir_penuh")
      ? selected
      : null;

  return (
    <>
      {slots.length === 0 ? (
        <p className="rounded-2xl bg-white p-5 text-center text-sm text-cocoa/70 shadow-sm">
          {WEB_ORDERING_CLOSED_MESSAGE}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {slots.map((slot) => {
            const state = getSlotState(slot);
            const disabled = state === "penuh" || state === "lewat";
            const isSelected = selectedValid?.id === slot.id;

            return (
              <li key={slot.id}>
                <button
                  type="button"
                  disabled={disabled}
                  aria-pressed={isSelected}
                  onClick={() => setPickupSlot(slot)}
                  className={`flex w-full flex-col items-start gap-1.5 rounded-2xl p-4 text-left shadow-sm ring-2 transition-colors ${
                    isSelected
                      ? "bg-pink/10 ring-pink"
                      : "bg-white ring-transparent hover:ring-pink/40"
                  } disabled:cursor-not-allowed disabled:bg-white/60 disabled:shadow-none disabled:hover:ring-transparent`}
                >
                  <span
                    className={`text-xl font-extrabold tabular-nums ${
                      disabled ? "text-cocoa/35 line-through" : "text-cocoa"
                    }`}
                  >
                    {formatSlotTime(slot.slot_time)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATE_BADGE[state]}`}
                  >
                    {STATE_LABEL[state]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-cocoa/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 px-4 py-4 min-[400px]:px-5">
          <div className="flex-1" aria-live="polite">
            {selectedValid ? (
              <>
                <p className="text-xs text-cocoa/60">
                  Dipilih: {formatSlotTime(selectedValid.slot_time)}
                </p>
                <p className="text-sm font-bold text-cocoa">
                  sisa {selectedValid.remaining} pesanan
                </p>
              </>
            ) : (
              <p className="text-sm text-cocoa/60">Pilih jam dulu ya</p>
            )}
          </div>
          {selectedValid ? (
            <Link
              href="/pesan/konfirmasi"
              className="flex h-12 items-center justify-center whitespace-nowrap rounded-full bg-pink px-4 text-sm font-bold text-white shadow-md transition-colors hover:bg-pink-dark"
            >
              Lanjut konfirmasi
            </Link>
          ) : (
            <span
              aria-disabled
              className="flex h-12 cursor-not-allowed items-center justify-center whitespace-nowrap rounded-full bg-cocoa/15 px-4 text-sm font-bold text-cocoa/40"
            >
              Lanjut konfirmasi
            </span>
          )}
        </div>
      </footer>
    </>
  );
}
