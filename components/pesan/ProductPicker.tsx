"use client";

import Link from "next/link";
import { MAX_CREPES_PER_ORDER, useCart } from "@/components/cart/CartProvider";
import { formatRupiah } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductPicker({ products }: { products: Product[] }) {
  const { totalQuantity, totalPrice, isFull } = useCart();

  return (
    <>
      {products.length === 0 ? (
        <p className="rounded-2xl bg-white p-5 text-center text-sm text-cocoa/70 shadow-sm">
          Menu lagi kosong nih. Cek lagi sebentar ya, atau langsung mampir ke booth!
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}

      {isFull && (
        <p
          role="status"
          className="mt-5 rounded-2xl bg-pink/15 px-4 py-3 text-center text-sm font-medium text-cocoa"
        >
          Maksimal {MAX_CREPES_PER_ORDER} crepe per pesanan. Mau lebih? Antre langsung
          di booth ya!
        </p>
      )}

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-cocoa/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-4 px-5 py-4">
          <div className="flex-1">
            <p className="text-xs text-cocoa/60">
              {totalQuantity} dari {MAX_CREPES_PER_ORDER} crepe
            </p>
            <p className="text-lg font-extrabold text-cocoa">{formatRupiah(totalPrice)}</p>
          </div>
          {totalQuantity > 0 ? (
            <Link
              href="/pesan/jam"
              className="flex h-12 items-center justify-center rounded-full bg-pink px-5 text-sm font-bold text-white shadow-md transition-colors hover:bg-pink-dark"
            >
              Lanjut pilih jam ambil
            </Link>
          ) : (
            <span
              aria-disabled
              className="flex h-12 cursor-not-allowed items-center justify-center rounded-full bg-cocoa/15 px-5 text-sm font-bold text-cocoa/40"
            >
              Lanjut pilih jam ambil
            </span>
          )}
        </div>
      </footer>
    </>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { getQuantity, increment, decrement, isFull } = useCart();
  const quantity = getQuantity(product.id);
  const soldOut = !product.is_available;

  return (
    <article
      className={`flex gap-4 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-cocoa/5 ${
        soldOut ? "opacity-60 grayscale" : ""
      }`}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-pink/30 to-[#FFE3CC]">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-4xl" aria-hidden>
            🥞
          </span>
        )}
        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 bg-cocoa/80 py-0.5 text-center text-xs font-bold text-white">
            Habis
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className="font-bold text-cocoa">{product.name}</h2>
        {product.description && (
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-cocoa/65">
            {product.description}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-extrabold text-cocoa">{formatRupiah(product.price)}</span>
          {soldOut ? (
            <span className="rounded-full bg-cocoa/10 px-3 py-1 text-xs font-bold text-cocoa/60">
              Habis
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <QtyButton
                label={`Kurangi ${product.name}`}
                disabled={quantity === 0}
                onClick={() => decrement(product.id)}
              >
                −
              </QtyButton>
              <span className="w-5 text-center font-bold tabular-nums" aria-live="polite">
                {quantity}
              </span>
              <QtyButton
                label={`Tambah ${product.name}`}
                disabled={isFull}
                onClick={() => increment(product)}
                primary
              >
                +
              </QtyButton>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function QtyButton({
  children,
  label,
  disabled,
  onClick,
  primary,
}: {
  children: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold transition-colors disabled:cursor-not-allowed disabled:bg-cocoa/10 disabled:text-cocoa/30 ${
        primary
          ? "bg-pink text-white hover:bg-pink-dark"
          : "bg-cream text-cocoa ring-1 ring-cocoa/15 hover:bg-[#FFEBD6]"
      }`}
    >
      {children}
    </button>
  );
}
