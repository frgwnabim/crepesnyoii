-- =========================================================
-- CrepeNyoii: kelola menu & slot dari admin
--
-- 1. Produk "Habis" tetap terlihat customer (abu-abu + label Habis), jadi
--    publik boleh SELECT semua produk. Pemesanan produk habis tetap ditolak
--    di create_order.
-- 2. Admin boleh menambah produk.
-- 3. products masuk publication realtime supaya toggle Tersedia/Habis
--    langsung terlihat di halaman customer (anon sekarang boleh SELECT,
--    jadi postgres_changes jalan untuk anon).
-- 4. Bucket Storage publik "product-images" untuk foto produk.
-- =========================================================

drop policy if exists "Publik lihat produk tersedia" on public.products;

create policy "Publik lihat semua produk"
  on public.products for select
  to anon, authenticated
  using (true);

create policy "Admin tambah produk"
  on public.products for insert
  to authenticated
  with check (true);

alter publication supabase_realtime add table public.products;

-- ---------- Storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,                                      -- dibaca lewat URL publik
  2097152,                                   -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- remove() di Storage API butuh SELECT + DELETE.
create policy "Admin lihat foto produk"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'product-images');

create policy "Admin upload foto produk"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

create policy "Admin ubah foto produk"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

create policy "Admin hapus foto produk"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images');
