"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import {
  parseRecentOrders,
  readRecentOrdersRaw,
  subscribeRecentOrders,
} from "@/lib/recent-orders";

// Shortcut ke pesanan yang pernah dibuat di perangkat ini.
export function RecentOrders() {
  const raw = useSyncExternalStore(subscribeRecentOrders, readRecentOrdersRaw, () => null);
  const codes = useMemo(() => parseRecentOrders(raw), [raw]);

  if (codes.length === 0) return null;

  return (
    <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-cocoa shadow-sm ring-1 ring-cocoa/10">
      <span className="font-semibold">Pesanan kamu: </span>
      {codes.map((code, i) => (
        <span key={code}>
          {i > 0 && ", "}
          <Link
            href={`/pesanan/${code}`}
            className="font-mono font-bold text-pink-dark underline underline-offset-2"
          >
            {code}
          </Link>
        </span>
      ))}
    </div>
  );
}
