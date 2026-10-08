"use client";

import { useSyncExternalStore } from "react";

const BOOTH_TZ = "Asia/Jakarta";

// Menit sejak tengah malam menurut jam booth (WIB).
function wibMinutesNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BOOTH_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

function subscribe(callback: () => void) {
  const timer = setInterval(callback, 15_000);
  return () => clearInterval(timer);
}

// null saat render di server, supaya tidak ada hydration mismatch.
export function useWibMinutes(): number | null {
  return useSyncExternalStore(subscribe, wibMinutesNow, () => null);
}

// "15:30:00" -> 930
export function slotTimeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
