import type { OrderStatus } from "@/lib/types";

const STEPS: { status: OrderStatus; label: string; hint: string }[] = [
  { status: "menunggu_konfirmasi", label: "Menunggu konfirmasi", hint: "Pesanan masuk ke booth" },
  { status: "dikonfirmasi", label: "Dikonfirmasi", hint: "Tim booth sudah terima" },
  { status: "disiapkan", label: "Disiapkan", hint: "Crepe-mu lagi dibuat" },
  { status: "siap_diambil", label: "Siap diambil", hint: "Ke booth, sebutkan kodenya" },
  { status: "selesai", label: "Selesai", hint: "Selamat menikmati!" },
];

export function StatusTimeline({ status }: { status: OrderStatus }) {
  const current = STEPS.findIndex((s) => s.status === status);

  return (
    <ol className="mt-4 flex flex-col">
      {STEPS.map((step, i) => {
        // "selesai" adalah langkah terakhir, jadi saat tercapai ikut dicentang.
        const done = i < current || (i === current && status === "selesai");
        const active = i === current && !done;
        const isLast = i === STEPS.length - 1;

        return (
          <li key={step.status} className="flex gap-3" aria-current={active ? "step" : undefined}>
            <div className="flex flex-col items-center">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-pink text-white ring-4 ring-pink/25"
                      : "bg-cocoa/10 text-cocoa/40"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              {!isLast && (
                <span
                  className={`my-1 w-0.5 flex-1 rounded-full ${done ? "bg-emerald-400" : "bg-cocoa/10"}`}
                />
              )}
            </div>
            <div className={isLast ? "" : "pb-4"}>
              <p
                className={`text-sm font-bold ${
                  done ? "text-cocoa" : active ? "text-pink-dark" : "text-cocoa/40"
                }`}
              >
                {step.label}
              </p>
              <p className={`text-xs ${done || active ? "text-cocoa/60" : "text-cocoa/30"}`}>
                {step.hint}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
