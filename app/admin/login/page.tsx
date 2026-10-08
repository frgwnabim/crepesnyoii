import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Login Admin",
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-slate-100 px-4 text-slate-900">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-2xl font-extrabold text-slate-900">Crepe Roll Nyoii</p>
          <p className="mt-1 text-sm text-slate-500">Panel admin booth</p>
        </div>
        <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />}>
          <LoginForm />
        </Suspense>
        <p className="mt-4 text-center text-xs text-slate-400">
          Akun admin dibuat lewat dashboard Supabase.
        </p>
      </div>
    </div>
  );
}
