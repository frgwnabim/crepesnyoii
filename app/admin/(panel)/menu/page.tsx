import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductManager } from "@/components/admin/ProductManager";
import { getAdminUser } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

export const metadata: Metadata = {
  title: "Menu & Stok",
};

export default function AdminMenuPage() {
  return (
    <main className="px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Menu & Stok</h1>
        <p className="text-sm text-slate-500">
          Perubahan stok langsung terlihat di halaman pesan customer.
        </p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white" />}>
        <ProductList />
      </Suspense>
    </main>
  );
}

async function ProductList() {
  await getAdminUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, price, image_url, is_available")
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
        Gagal memuat produk: {error.message}
      </p>
    );
  }

  return <ProductManager products={(data ?? []) as Product[]} />;
}
