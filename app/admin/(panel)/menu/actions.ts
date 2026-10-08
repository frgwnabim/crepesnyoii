"use server";

import { refresh } from "next/cache";
import { getAdminUser } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type ProductInput = {
  id?: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
};

const NAME_MAX = 50;
const DESCRIPTION_MAX = 200;
const PRICE_MAX = 1_000_000;

function validate(input: ProductInput): string | null {
  const name = input.name.trim();
  if (name.length < 2 || name.length > NAME_MAX) return `Nama produk 2 sampai ${NAME_MAX} karakter.`;
  if (input.description.trim().length > DESCRIPTION_MAX) {
    return `Deskripsi maksimal ${DESCRIPTION_MAX} karakter.`;
  }
  if (!Number.isInteger(input.price) || input.price < 0 || input.price > PRICE_MAX) {
    return "Harga harus angka bulat antara 0 dan 1.000.000.";
  }
  if (input.image_url && !/^https:\/\//.test(input.image_url)) return "URL gambar tidak valid.";
  return null;
}

export async function saveProduct(input: ProductInput): Promise<ActionResult> {
  await getAdminUser();
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const row = {
    name: input.name.trim(),
    description: input.description.trim() || null,
    price: input.price,
    image_url: input.image_url,
  };

  // .select() supaya kegagalan RLS (0 baris) ketahuan, bukan sukses diam-diam.
  const { data, error } = input.id
    ? await supabase.from("products").update(row).eq("id", input.id).select("id")
    : await supabase.from("products").insert(row).select("id");

  if (error || !data?.length) {
    return { ok: false, error: "Gagal menyimpan produk. Coba lagi ya." };
  }
  refresh();
  return { ok: true };
}

export async function setProductAvailable(id: string, available: boolean): Promise<ActionResult> {
  await getAdminUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update({ is_available: available })
    .eq("id", id)
    .select("id");

  refresh();
  if (error || !data?.length) return { ok: false, error: "Gagal mengubah stok." };
  return { ok: true };
}
