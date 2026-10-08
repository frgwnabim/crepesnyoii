import { StepHeader } from "@/components/StepHeader";
import { OrderForm } from "@/components/pesan/OrderForm";

export default function KonfirmasiPage() {
  return (
    <>
      <StepHeader step={3} title="Konfirmasi pesanan" backHref="/pesan/jam" />
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-12 pt-2">
        <OrderForm />
      </main>
    </>
  );
}
