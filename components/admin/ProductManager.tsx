"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { saveProduct, setProductAvailable } from "@/app/admin/(panel)/menu/actions";
import { formatRupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";

const BUCKET = "product-images";
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ProductManager({ products }: { products: Product[] }) {
  // null = dialog tertutup, "new" = tambah, Product = edit.
  const [editing, setEditing] = useState<Product | "new" | null>(null);

  return (
    <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <p className="text-sm text-slate-500">
          {products.filter((p) => p.is_available).length} dari {products.length} produk tersedia
        </p>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
        >
          + Tambah produk
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Produk</th>
              <th className="px-4 py-3 font-semibold">Harga</th>
              <th className="px-4 py-3 font-semibold">Stok</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                  Belum ada produk. Tambahkan produk pertama.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <ProductRow key={p.id} product={p} onEdit={() => setEditing(p)} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProductFormDialog
          key={editing === "new" ? "new" : editing.id}
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function ProductRow({ product, onEdit }: { product: Product; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const [available, setOptimisticAvailable] = useOptimistic(product.is_available);
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !available;
    setError(null);
    startTransition(async () => {
      setOptimisticAvailable(next);
      const result = await setProductAvailable(product.id, next);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <tr className={available ? "" : "bg-slate-50/60"}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <ProductThumb url={product.image_url} name={product.name} dim={!available} />
          <div className="min-w-0">
            <p className={`font-semibold ${available ? "text-slate-900" : "text-slate-400"}`}>
              {product.name}
            </p>
            {product.description && (
              <p className="line-clamp-1 hidden max-w-md text-xs text-slate-500 md:block">{product.description}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 font-semibold tabular-nums">{formatRupiah(product.price)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={available}
            aria-label={`Stok ${product.name}`}
            disabled={pending}
            onClick={toggle}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
              available ? "bg-emerald-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                available ? "left-5.5" : "left-0.5"
              }`}
            />
          </button>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              available ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
            }`}
          >
            {available ? "Tersedia" : "Habis"}
          </span>
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={onEdit}
          className="h-9 rounded-lg px-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50"
        >
          Edit
        </button>
      </td>
    </tr>
  );
}

function ProductThumb({ url, name, dim }: { url: string | null; name: string; dim?: boolean }) {
  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 ${
        dim ? "opacity-50 grayscale" : ""
      }`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden className="text-xl">
          🥞
        </span>
      )}
    </div>
  );
}

// Path file di bucket dari URL publik, untuk menghapus gambar lama.
function storagePathFromUrl(url: string | null) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = url?.indexOf(marker) ?? -1;
  return url && i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}

function ProductFormDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // Bersihkan object URL preview saat diganti / dialog ditutup.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function pickFile(f: File | null) {
    setError(null);
    if (f && !ALLOWED_TYPES.includes(f.type)) {
      setError("Format gambar harus JPG, PNG, atau WebP.");
      return;
    }
    if (f && f.size > MAX_IMAGE_BYTES) {
      setError("Ukuran gambar maksimal 2 MB.");
      return;
    }
    setFile(f);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setError(null);

    const priceNumber = Number(price);
    if (!price || !Number.isInteger(priceNumber)) {
      setError("Harga harus angka bulat, tanpa titik. Contoh: 18000");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    let imageUrl = product?.image_url ?? null;
    let uploadedPath: string | null = null;

    if (file) {
      const ext = file.type.split("/")[1].replace("jpeg", "jpg");
      uploadedPath = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(uploadedPath, file, { contentType: file.type, cacheControl: "31536000" });
      if (uploadError) {
        setError("Gagal upload gambar. Coba lagi ya.");
        setSaving(false);
        return;
      }
      imageUrl = supabase.storage.from(BUCKET).getPublicUrl(uploadedPath).data.publicUrl;
    }

    const result = await saveProduct({
      id: product?.id,
      name,
      description,
      price: priceNumber,
      image_url: imageUrl,
    });

    if (!result.ok) {
      // Jangan tinggalkan file yatim kalau simpan produk gagal.
      if (uploadedPath) void supabase.storage.from(BUCKET).remove([uploadedPath]);
      setError(result.error);
      setSaving(false);
      return;
    }

    // Gambar lama diganti: hapus dari bucket (best effort).
    const oldPath = file ? storagePathFromUrl(product?.image_url ?? null) : null;
    if (oldPath) void supabase.storage.from(BUCKET).remove([oldPath]);

    dialogRef.current?.close();
  }

  const shownImage = previewUrl ?? product?.image_url ?? null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto w-full max-w-lg rounded-2xl p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        <h2 className="text-lg font-bold">{product ? `Edit ${product.name}` : "Tambah produk"}</h2>

        <div className="flex items-center gap-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
            {shownImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shownImage} alt="Pratinjau" className="h-full w-full object-cover" />
            ) : (
              <span aria-hidden className="text-3xl">
                🥞
              </span>
            )}
          </div>
          <div className="text-sm">
            <label className="inline-flex h-9 cursor-pointer items-center rounded-lg px-3 font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
              {shownImage ? "Ganti gambar" : "Pilih gambar"}
              <input
                type="file"
                accept={ALLOWED_TYPES.join(",")}
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </label>
            <p className="mt-1.5 text-xs text-slate-500">JPG, PNG, atau WebP. Maks 2 MB.</p>
          </div>
        </div>

        <Field label="Nama produk" htmlFor="product-name">
          <input
            id="product-name"
            required
            minLength={2}
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Deskripsi" htmlFor="product-description">
          <textarea
            id="product-description"
            rows={2}
            maxLength={200}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputClass} h-auto resize-none py-2`}
          />
        </Field>

        <Field label="Harga (Rp)" htmlFor="product-price">
          <input
            id="product-price"
            required
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
            placeholder="18000"
            className={`${inputClass} tabular-nums`}
          />
          {price && Number.isInteger(Number(price)) && (
            <p className="mt-1 text-xs text-slate-500">{formatRupiah(Number(price))}</p>
          )}
        </Field>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="h-10 rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-lg bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}
