"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { PickupSlot, Product } from "@/lib/types";

// Aturan bisnis: maksimal 2 crepe per pesanan (total semua varian).
export const MAX_CREPES_PER_ORDER = 2;

export type CartItem = {
  product: Product;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  totalQuantity: number;
  totalPrice: number;
  isFull: boolean;
  getQuantity: (productId: string) => number;
  increment: (product: Product) => void;
  decrement: (productId: string) => void;
  pickupSlot: PickupSlot | null;
  setPickupSlot: (slot: PickupSlot | null) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [pickupSlot, setPickupSlot] = useState<PickupSlot | null>(null);

  const value = useMemo<CartContextValue>(() => {
    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalPrice = items.reduce(
      (sum, i) => sum + i.quantity * i.product.price,
      0,
    );

    return {
      items,
      totalQuantity,
      totalPrice,
      isFull: totalQuantity >= MAX_CREPES_PER_ORDER,
      getQuantity: (productId) =>
        items.find((i) => i.product.id === productId)?.quantity ?? 0,
      increment: (product) =>
        setItems((prev) => {
          const total = prev.reduce((sum, i) => sum + i.quantity, 0);
          if (total >= MAX_CREPES_PER_ORDER || !product.is_available) {
            return prev;
          }
          const existing = prev.find((i) => i.product.id === product.id);
          if (existing) {
            return prev.map((i) =>
              i.product.id === product.id
                ? { ...i, quantity: i.quantity + 1 }
                : i,
            );
          }
          return [...prev, { product, quantity: 1 }];
        }),
      decrement: (productId) =>
        setItems((prev) =>
          prev
            .map((i) =>
              i.product.id === productId
                ? { ...i, quantity: i.quantity - 1 }
                : i,
            )
            .filter((i) => i.quantity > 0),
        ),
      pickupSlot,
      setPickupSlot,
      clear: () => {
        setItems([]);
        setPickupSlot(null);
      },
    };
  }, [items, pickupSlot]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart harus dipakai di dalam <CartProvider>");
  }
  return ctx;
}
