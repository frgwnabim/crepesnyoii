"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {MENU.map((item) => {
        const active = item.isActive(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
              active ? "bg-slate-700 text-white" : "hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
