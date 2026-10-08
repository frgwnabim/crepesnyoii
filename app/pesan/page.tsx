import { Suspense } from "react";
import { StepHeader } from "@/components/StepHeader";
import { ProductPicker } from "@/components/pesan/ProductPicker";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

export default function PesanPage() {
  return (
    <>
      <StepHeader step={1} title="Pilih crepe kamu" backHref="/" />
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-40 pt-2">
        <Suspense fallback={<ProductListSkeleton />}>
          <ProductList />
        </Suspense>
      </main>
    </>
  );
}

async function ProductList() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, price, image_url, is_available")
    .eq("is_available", true)
    .order("price", { ascending: true });

  if (error) {
    return (
      <p className="rounded-2xl bg-white p-5 text-center text-sm text-cocoa/70 shadow-sm">
        Yah, menu gagal dimuat. Coba muat ulang halaman ini ya.
      </p>
    );
  }

  return <ProductPicker products={(data ?? []) as Product[]} />;
}

function ProductListSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-4 rounded-3xl bg-white p-3 shadow-sm">
          <div className="h-24 w-24 shrink-0 animate-pulse rounded-2xl bg-cocoa/10" />
          <div className="flex flex-1 flex-col gap-2 py-1">
            <div className="h-4 w-2/3 animate-pulse rounded bg-cocoa/10" />
            <div className="h-3 w-full animate-pulse rounded bg-cocoa/10" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-cocoa/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
