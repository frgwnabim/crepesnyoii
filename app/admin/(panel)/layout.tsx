import type { Metadata } from "next";
import { Suspense } from "react";
import { logout } from "@/app/admin/actions";
import { AdminAlertControls } from "@/components/admin/AdminAlertControls";
import { AdminNav, AdminNavLinks } from "@/components/admin/AdminNav";
import { AdminRealtimeProvider } from "@/components/admin/AdminRealtimeProvider";
import { getAdminUser } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s | Admin Crepe Roll Nyoii",
  },
};

// Desktop (lg+): sidebar gelap di kiri. Tablet portrait / layar kecil: top bar gelap.
export default function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AdminRealtimeProvider>
      <div className="flex min-h-screen flex-1 flex-col bg-slate-100 text-slate-900 lg:flex-row">
        <aside className="sticky top-0 z-30 flex shrink-0 items-center gap-2 bg-slate-900 px-3 py-2 text-slate-300 lg:h-screen lg:w-60 lg:flex-col lg:items-stretch lg:gap-0 lg:p-0">
          <div className="shrink-0 px-1 lg:px-5 lg:py-6">
            <p className="font-extrabold text-white lg:text-lg">
              <span className="lg:hidden">Nyoii</span>
              <span className="hidden lg:inline">Crepe Roll Nyoii</span>
            </p>
            <p className="hidden text-xs text-slate-400 lg:block">Panel admin</p>
          </div>

          <Suspense fallback={<AdminNavLinks pathname="" />}>
            <AdminNav />
          </Suspense>

          <div className="ml-auto lg:ml-0 lg:mt-auto lg:border-t lg:border-slate-800">
            <AdminAlertControls />
          </div>

          <div className="shrink-0 lg:border-t lg:border-slate-800 lg:px-5 lg:py-4">
            <div className="hidden lg:block">
              <Suspense fallback={<div className="h-9 animate-pulse rounded bg-slate-800" />}>
                <AdminUserInfo />
              </Suspense>
            </div>
            <form action={logout} className="lg:mt-3">
              <button
                type="submit"
                className="rounded-lg bg-slate-800 px-3 py-2 text-left text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700 lg:w-full"
              >
                Keluar
              </button>
            </form>
          </div>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </AdminRealtimeProvider>
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
