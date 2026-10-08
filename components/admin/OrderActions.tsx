"use client";

import { useRef, useState, useTransition } from "react";
import { runOrderAction } from "@/app/admin/actions";
import {
  CANCEL_REASONS,
  ORDER_ACTION_LABEL,
  canCancelLater,
  getPrimaryActions,
  type OrderAction,
} from "@/lib/admin/order-actions";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

type Props = {
  orderId: string;
  orderCode: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  // compact: tombol kecil di baris tabel. full: halaman detail.
  variant?: "compact" | "full";
};

const ACTION_STYLE: Record<OrderAction, string> = {
  konfirmasi: "bg-slate-900 text-white hover:bg-slate-700",
  siapkan: "bg-yellow-400 text-yellow-950 hover:bg-yellow-300",
  siap: "bg-pink-500 text-white hover:bg-pink-400",
  lunas: "bg-amber-100 text-amber-900 ring-1 ring-amber-300 hover:bg-amber-200",
  selesai: "bg-emerald-600 text-white hover:bg-emerald-500",
  batalkan: "bg-white text-red-600 ring-1 ring-red-200 hover:bg-red-50",
};

export function OrderActions({
  orderId,
  orderCode,
  status,
  paymentStatus,
  variant = "full",
}: Props) {
  const [pending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<OrderAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const compact = variant === "compact";
  const actions = getPrimaryActions(status, paymentStatus);
  const showLateCancel = !compact && canCancelLater(status);
  const unpaid = paymentStatus !== "lunas";

  function run(action: OrderAction, reason?: string) {
    setError(null);
    setPendingAction(action);
    startTransition(async () => {
      const result = await runOrderAction(orderId, action, reason);
      if (!result.ok) setError(result.error);
      else dialogRef.current?.close();
      setPendingAction(null);
    });
  }

  function handleClick(action: OrderAction) {
    if (action === "batalkan") {
      setError(null);
      dialogRef.current?.showModal();
      return;
    }
    run(action);
  }

  if (actions.length === 0 && !showLateCancel) {
    return compact ? <span className="text-xs text-slate-400">-</span> : null;
  }

  const size = compact ? "h-8 px-3 text-xs" : "h-11 px-5 text-sm";

  return (
    // stopPropagation: klik tombol/dialog di baris tabel tidak membuka halaman detail.
    <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-2">
      <div className={`flex flex-wrap items-center ${compact ? "gap-1.5" : "gap-2"}`}>
        {actions.map((action) => {
          const blocked = action === "selesai" && unpaid;
          return (
            <button
              key={action}
              type="button"
              disabled={pending || blocked}
              onClick={() => handleClick(action)}
              title={blocked ? "Pastikan customer sudah bayar di kasir." : undefined}
              className={`${size} whitespace-nowrap rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${ACTION_STYLE[action]}`}
            >
              {pendingAction === action ? "Menyimpan..." : ORDER_ACTION_LABEL[action]}
            </button>
          );
        })}
      </div>

      {!compact && actions.includes("selesai") && unpaid && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
          ⚠️ Pastikan customer sudah bayar di kasir. Tandai lunas dulu sebelum menyelesaikan
          pesanan.
        </p>
      )}

      {showLateCancel && (
        <button
          type="button"
          disabled={pending}
          onClick={() => handleClick("batalkan")}
          className="self-start text-sm font-semibold text-red-600 hover:underline disabled:opacity-40"
        >
          Batalkan pesanan
        </button>
      )}

      {error && (
        <p role="alert" className={`text-red-600 ${compact ? "text-xs" : "text-sm"}`}>
          {error}
        </p>
      )}

      <CancelDialog
        ref={dialogRef}
        orderCode={orderCode}
        pending={pending}
        error={pendingAction === null ? error : null}
        onConfirm={(reason) => run("batalkan", reason)}
      />
    </div>
  );
}

function CancelDialog({
  ref,
  orderCode,
  pending,
  error,
  onConfirm,
}: {
  ref: React.Ref<HTMLDialogElement>;
  orderCode: string;
  pending: boolean;
  error: string | null;
  onConfirm: (reason: string) => void;
}) {
  const [choice, setChoice] = useState<string>(CANCEL_REASONS[0]);
  const [other, setOther] = useState("");
  const isOther = choice === "lainnya";
  const reason = isOther ? other.trim() : choice;

  return (
    <dialog
      ref={ref}
      className="m-auto w-full max-w-md rounded-2xl p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50"
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          if (reason) onConfirm(reason);
        }}
        className="flex flex-col gap-4 p-6"
      >
        <div>
          <h2 className="text-lg font-bold">Batalkan pesanan {orderCode}?</h2>
          <p className="mt-1 text-sm text-slate-500">
            Alasan ini akan terlihat oleh customer di halaman pesanannya.
          </p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">Alasan pembatalan</legend>
          {[...CANCEL_REASONS, "lainnya"].map((value) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm ring-1 ${
                choice === value ? "bg-red-50 ring-red-300" : "ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="cancel-reason"
                value={value}
                checked={choice === value}
                onChange={() => setChoice(value)}
                className="accent-red-600"
              />
              {value === "lainnya" ? "Lainnya" : value}
            </label>
          ))}
          {isOther && (
            <input
              type="text"
              autoFocus
              maxLength={200}
              value={other}
              onChange={(e) => setOther(e.target.value)}
              placeholder="Tulis alasannya..."
              aria-label="Alasan lainnya"
              className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          )}
        </fieldset>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={(e) => e.currentTarget.closest("dialog")?.close()}
            className="h-10 rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Kembali
          </button>
          <button
            type="submit"
            disabled={pending || !reason}
            className="h-10 rounded-lg bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Membatalkan..." : "Ya, batalkan"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
