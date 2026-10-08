import type { Metadata } from "next";
import { Suspense } from "react";
import { logout } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { getAdminUser } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: "Admin | Crepe Roll Nyoii",
};

export default function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-screen flex-1 bg-slate-100 text-slate-900">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-slate-900 text-slate-300">
        <div className="px-5 py-6">
          <p className="text-lg font-extrabold text-white">Crepe Roll Nyoii</p>
          <p className="text-xs text-slate-400">Panel admin</p>
        </div>

        <AdminNav />

        <div className="mt-auto border-t border-slate-800 px-5 py-4">
          <Suspense fallback={<div className="h-9 animate-pulse rounded bg-slate-800" />}>
            <AdminUserInfo />
          </Suspense>
          <form action={logout} className="mt-3">
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-800 px-3 py-2 text-left text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700"
            >
              Keluar
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

async function AdminUserInfo() {
  const user = await getAdminUser();
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-bold text-white">{user.name}</p>
      <p className="truncate text-xs text-slate-400">{user.email}</p>
    </div>
  );
}
