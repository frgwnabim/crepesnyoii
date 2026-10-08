import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
};

// Lapis kedua setelah proxy.ts: setiap halaman admin tetap cek sesi di server.
export async function getAdminUser(): Promise<AdminUser> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    redirect("/admin/login");
  }

  const email = typeof claims.email === "string" ? claims.email : "";
  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof meta.name === "string" && meta.name) ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    email.split("@")[0] ||
    "Admin";

  return { id: claims.sub, name, email };
}

// Hanya izinkan redirect balik ke halaman admin (cegah open redirect).
export function safeAdminRedirect(next: unknown) {
  return typeof next === "string" &&
    (next === "/admin" || next.startsWith("/admin/")) &&
    !next.startsWith("/admin/login")
    ? next
    : "/admin";
}
