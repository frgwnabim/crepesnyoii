"use client";

import { useEffect, useState } from "react";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Cadangan untuk browser lama / konteks non-HTTPS.
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

export function CopyCodeButton({ code }: { code: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <button
      type="button"
      onClick={async () => setState((await copyText(code)) ? "copied" : "failed")}
      className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-cream px-5 text-sm font-bold text-cocoa ring-1 ring-cocoa/15 transition-colors hover:bg-[#FFEBD6]"
    >
      <span aria-live="polite">
        {state === "copied"
          ? "✓ Kode tersalin"
          : state === "failed"
            ? "Gagal menyalin, catat manual ya"
            : "Salin kode"}
      </span>
    </button>
  );
}
