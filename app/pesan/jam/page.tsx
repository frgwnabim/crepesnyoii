import type { Metadata } from "next";
import { Suspense } from "react";
import { StepHeader } from "@/components/StepHeader";
import { SlotPicker } from "@/components/pesan/SlotPicker";
import { createClient } from "@/lib/supabase/server";
import type { PickupSlot } from "@/lib/types";

export const metadata: Metadata = {
  title: "Pilih jam ambil",
};

export default function PilihJamPage() {
  return (
    <>
      <StepHeader step={2} title="Pilih jam ambil" backHref="/pesan" />
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-40 pt-2">
        <Suspense fallback={<SlotListSkeleton />}>
          <SlotList />
        </Suspense>
      </main>
    </>
  );
}

async function SlotList() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_pickup_slots");

  if (error) {
    return (
      <p className="rounded-2xl bg-white p-5 text-center text-sm text-cocoa/70 shadow-sm">
        Yah, jadwal ambil gagal dimuat. Coba muat ulang halaman ini ya.
      </p>
    );
  }

  return <SlotPicker slots={(data ?? []) as PickupSlot[]} />;
}

function SlotListSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3" aria-busy>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-white shadow-sm" />
      ))}
    </div>
  );
}
