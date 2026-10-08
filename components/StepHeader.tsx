import Link from "next/link";

type Props = {
  step: number;
  total?: number;
  title: string;
  backHref: string;
};

export function StepHeader({ step, total = 3, title, backHref }: Props) {
  return (
    <header className="sticky top-0 z-10 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-center gap-3 px-5 py-4">
        <Link
          href={backHref}
          aria-label="Kembali"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-xl text-cocoa shadow-sm ring-1 ring-cocoa/10"
        >
          ‹
        </Link>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-pink-dark">
            Langkah {step} dari {total}
          </p>
          <h1 className="text-lg font-extrabold text-cocoa">{title}</h1>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-md gap-1.5 px-5 pb-3">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-pink" : "bg-cocoa/10"}`}
          />
        ))}
      </div>
    </header>
  );
}
