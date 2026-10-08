"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type Toast = {
  id: number;
  title: string;
  body?: string;
  tone?: "default" | "success" | "highlight";
  action?: { label: string; href: string };
  // Tidak hilang otomatis, harus ditutup manual.
  sticky?: boolean;
};

const AUTO_DISMISS_MS = 8000;
const MAX_TOASTS = 4;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = nextId.current++;
      setToasts((prev) => [{ ...toast, id }, ...prev].slice(0, MAX_TOASTS));
      if (!toast.sticky) {
        timers.current.set(id, setTimeout(() => dismiss(id), AUTO_DISMISS_MS));
      }
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  return { toasts, push, dismiss };
}

const TONE: Record<"admin" | "customer", Record<NonNullable<Toast["tone"]>, string>> = {
  admin: {
    default: "bg-white text-slate-900 ring-slate-200",
    success: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    highlight: "bg-slate-900 text-white ring-slate-700",
  },
  customer: {
    default: "bg-white text-cocoa ring-cocoa/10",
    success: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    highlight: "bg-pink text-white ring-pink-dark",
  },
};

export function ToastStack({
  toasts,
  onDismiss,
  theme,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
  theme: "admin" | "customer";
}) {
  const position =
    theme === "admin"
      ? "right-4 top-4 w-[calc(100%-2rem)] items-end sm:w-96"
      : "inset-x-0 top-3 mx-auto w-full max-w-md items-stretch px-4";

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed z-50 flex flex-col gap-2 ${position}`}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl p-4 shadow-lg ring-1 ${
            TONE[theme][t.tone ?? "default"]
          } ${t.tone === "highlight" && theme === "customer" ? "animate-bounce-once p-5" : ""}`}
        >
          <div className="min-w-0 flex-1">
            <p className={`font-bold ${t.tone === "highlight" && theme === "customer" ? "text-lg" : "text-sm"}`}>
              {t.title}
            </p>
            {t.body && <p className="mt-0.5 text-sm opacity-80">{t.body}</p>}
            {t.action && (
              <Link
                href={t.action.href}
                onClick={() => onDismiss(t.id)}
                className="mt-2 inline-block text-sm font-bold underline underline-offset-2"
              >
                {t.action.label}
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Tutup notifikasi"
            className="-m-1 rounded p-1 text-lg leading-none opacity-60 hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
