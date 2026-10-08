"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminRealtime } from "@/components/admin/AdminRealtimeProvider";

const MENU = [
  {
    href: "/admin",
    label: "Pesanan",
    icon: "🧾",
    isActive: (p: string) => p === "/admin" || p.startsWith("/admin/pesanan"),
  },
  {
    href: "/admin/menu",
    label: "Menu & Stok",
    icon: "🥞",
    isActive: (p: string) => p.startsWith("/admin/menu"),
  },
  {
    href: "/admin/slot",
    label: "Slot Waktu",
    icon: "🕒",
    isActive: (p: string) => p.startsWith("/admin/slot"),
  },
];

export function AdminNav() {
  return <AdminNavLinks pathname={usePathname()} />;
}

// Dipakai juga sebagai fallback <Suspense> (tanpa highlight) saat pathname belum tersedia.
export function AdminNavLinks({ pathname }: { pathname: string }) {
  const { pendingCount } = useAdminRealtime();

  return (
    <nav className="flex gap-1 lg:flex-col lg:px-3">
      {MENU.map((item) => {
        const active = item.isActive(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors lg:gap-3 lg:px-3 lg:py-2.5 ${
              active ? "bg-slate-700 text-white" : "hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span aria-hidden>{item.icon}</span>
            {/* Label disembunyikan di layar sempit, ikon tetap ada + aria-label. */}
            <span className="hidden sm:inline">{item.label}</span>
            <span className="sr-only sm:hidden">{item.label}</span>
            {item.href === "/admin" && !!pendingCount && (
              <span
                aria-label={`${pendingCount} pesanan menunggu konfirmasi`}
                className="min-w-6 rounded-full lg:ml-auto bg-red-500 px-1.5 py-0.5 text-center text-xs font-bold text-white tabular-nums"
              >
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
