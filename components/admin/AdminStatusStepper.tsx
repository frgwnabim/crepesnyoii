import { ORDER_STATUS_LABEL } from "@/lib/admin/status";
import type { OrderStatus } from "@/lib/types";

const STEPS: OrderStatus[] = [
  "menunggu_konfirmasi",
  "dikonfirmasi",
  "disiapkan",
  "siap_diambil",
  "selesai",
];

// Versi horizontal dari timeline customer: selesai = centang hijau, aktif = highlight, belum = abu.
export function AdminStatusStepper({ status }: { status: OrderStatus }) {
  const current = STEPS.indexOf(status);

  return (
    <ol className="flex items-start">
      {STEPS.map((step, i) => {
        const done = i < current || (i === current && status === "selesai");
        const active = i === current && !done;
        const isLast = i === STEPS.length - 1;

        return (
          <li
            key={step}
            aria-current={active ? "step" : undefined}
            className="relative flex flex-1 flex-col items-center text-center"
          >
            {!isLast && (
              <span
                aria-hidden
                className={`absolute left-1/2 top-4 h-0.5 w-full ${
                  i < current ? "bg-emerald-400" : "bg-slate-200"
                }`}
              />
            )}
            <span
              className={`relative flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                done
                  ? "bg-emerald-500 text-white"
                  : active
                    ? "bg-slate-900 text-white ring-4 ring-slate-900/15"
                    : "bg-slate-200 text-slate-400"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={`mt-2 text-xs font-semibold ${
                done ? "text-slate-700" : active ? "text-slate-900" : "text-slate-400"
              }`}
            >
              {ORDER_STATUS_LABEL[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
