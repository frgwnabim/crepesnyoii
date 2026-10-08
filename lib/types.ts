export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
};

// Hasil RPC get_pickup_slots.
export type PickupSlot = {
  id: string;
  slot_time: string; // "15:30:00"
  max_orders: number;
  used_count: number;
  remaining: number;
  is_past: boolean;
};

export type OrderStatus =
  | "menunggu_konfirmasi"
  | "dikonfirmasi"
  | "disiapkan"
  | "siap_diambil"
  | "selesai"
  | "dibatalkan";

export type PaymentStatus = "belum_bayar" | "lunas";

// Hasil RPC get_order_by_code.
export type OrderDetail = {
  code: string;
  customer_name: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total_price: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  pickup_slot: { id: string; slot_time: string };
  items: {
    product_id: string;
    product_name: string;
    quantity: number;
    price_at_order: number;
  }[];
  cancel_reason: string | null;
};
