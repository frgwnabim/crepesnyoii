-- =========================================================
-- CrepeNyoii: hardening
--
-- 1. Allowlist admin (admin_users + is_admin()).
--    Sebelumnya semua user "authenticated" = admin. Kalau sign-up Supabase
--    lupa dimatikan, siapa pun bisa daftar lewat API publik lalu mengubah
--    status pesanan. Sekarang hanya user_id di admin_users yang dianggap admin.
--
-- 2. Rate limit create_order:
--    - maks 3 pesanan per perangkat per jam (device_id dari localStorage)
--    - maks 30 pesanan per IP per jam (jaring kasar untuk bot yang reset
--      device_id; longgar karena wifi kampus/festival berbagi satu IP)
--
-- 3. get_order_by_code (publik, cukup tahu kode): nama disamarkan dan
--    catatan tidak dikembalikan. Kode 4 karakter hanya ~1 juta kombinasi,
--    jadi bisa ditebak; jangan bocorkan data pribadi lewat jalur ini.
-- =========================================================

-- ---------- 1. Admin allowlist ----------
create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
-- Tidak ada policy: tabel ini hanya dibaca lewat is_admin() (security definer)
-- dan diisi manual lewat SQL Editor.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Ganti semua policy admin "using (true)" menjadi is_admin().
drop policy "Admin lihat semua produk" on public.products;
drop policy "Admin ubah produk"        on public.products;
drop policy "Admin tambah produk"      on public.products;
drop policy "Admin lihat semua slot"   on public.pickup_slots;
drop policy "Admin ubah slot"          on public.pickup_slots;
drop policy "Admin lihat semua order"  on public.orders;
drop policy "Admin ubah order"         on public.orders;
drop policy "Admin lihat semua item order" on public.order_items;
drop policy "Admin ubah item order"        on public.order_items;
drop policy "Admin lihat semua event order" on public.order_events;
drop policy "Admin ubah event order"        on public.order_events;

create policy "Admin ubah produk" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin tambah produk" on public.products
  for insert to authenticated with check (public.is_admin());

create policy "Admin lihat semua slot" on public.pickup_slots
  for select to authenticated using (public.is_admin());
create policy "Admin ubah slot" on public.pickup_slots
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admin lihat semua order" on public.orders
  for select to authenticated using (public.is_admin());
create policy "Admin ubah order" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admin lihat semua item order" on public.order_items
  for select to authenticated using (public.is_admin());
create policy "Admin ubah item order" on public.order_items
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admin lihat semua event order" on public.order_events
  for select to authenticated using (public.is_admin());
create policy "Admin ubah event order" on public.order_events
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy "Admin lihat foto produk"  on storage.objects;
drop policy "Admin upload foto produk" on storage.objects;
drop policy "Admin ubah foto produk"   on storage.objects;
drop policy "Admin hapus foto produk"  on storage.objects;

create policy "Admin lihat foto produk" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
create policy "Admin upload foto produk" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "Admin ubah foto produk" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "Admin hapus foto produk" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- admin_order_action: sama seperti sebelumnya, cek admin pakai is_admin().
create or replace function public.admin_order_action(
  p_order_id uuid,
  p_action   text,
  p_reason   text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_jwt        jsonb := auth.jwt();
  v_admin_name text;
  v_order      public.orders%rowtype;
  v_reason     text := nullif(btrim(coalesce(p_reason, '')), '');
  v_from       public.order_status;
  v_to         public.order_status;
  v_message    text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Harus login sebagai admin' using hint = 'NOT_AUTHENTICATED';
  end if;

  v_admin_name := coalesce(
    nullif(btrim(v_jwt -> 'user_metadata' ->> 'name'), ''),
    nullif(btrim(v_jwt -> 'user_metadata' ->> 'full_name'), ''),
    nullif(split_part(v_jwt ->> 'email', '@', 1), ''),
    'Admin'
  );

  if p_action not in ('konfirmasi', 'siapkan', 'siap', 'selesai', 'lunas', 'batalkan') then
    raise exception 'Aksi tidak dikenal' using hint = 'INVALID_ACTION';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan' using hint = 'NOT_FOUND';
  end if;

  if p_action = 'lunas' then
    if v_order.payment_status = 'lunas'
       or v_order.status in ('selesai', 'dibatalkan') then
      raise exception 'Status bayar tidak bisa diubah' using hint = 'INVALID_TRANSITION';
    end if;

    update public.orders set payment_status = 'lunas' where id = v_order.id;

    insert into public.order_events (order_id, event_type, message, actor, actor_name)
    values (v_order.id, 'lunas', 'Pembayaran diterima di kasir', 'admin', v_admin_name);

    return jsonb_build_object('status', v_order.status, 'payment_status', 'lunas');
  end if;

  case p_action
    when 'konfirmasi' then
      v_from := 'menunggu_konfirmasi'; v_to := 'dikonfirmasi';
      v_message := 'Pesanan dikonfirmasi';
    when 'siapkan' then
      v_from := 'dikonfirmasi'; v_to := 'disiapkan';
      v_message := 'Pesanan mulai disiapkan';
    when 'siap' then
      v_from := 'disiapkan'; v_to := 'siap_diambil';
      v_message := 'Pesanan siap diambil';
    when 'selesai' then
      v_from := 'siap_diambil'; v_to := 'selesai';
      v_message := 'Pesanan selesai diambil';
    when 'batalkan' then
      v_from := null; v_to := 'dibatalkan';
      v_message := v_reason;
  end case;

  if p_action = 'batalkan' then
    if v_order.status in ('selesai', 'dibatalkan') then
      raise exception 'Pesanan ini sudah tidak bisa dibatalkan' using hint = 'INVALID_TRANSITION';
    end if;
    if v_reason is null then
      raise exception 'Alasan pembatalan wajib diisi' using hint = 'REASON_REQUIRED';
    end if;
    if length(v_reason) > 200 then
      raise exception 'Alasan pembatalan maksimal 200 karakter' using hint = 'REASON_REQUIRED';
    end if;
  elsif v_order.status <> v_from then
    raise exception 'Status pesanan sudah berubah' using hint = 'INVALID_TRANSITION';
  end if;

  if p_action = 'selesai' and v_order.payment_status <> 'lunas' then
    raise exception 'Pesanan belum lunas' using hint = 'NOT_PAID';
  end if;

  update public.orders set status = v_to where id = v_order.id;

  insert into public.order_events (order_id, event_type, message, actor, actor_name)
  values (v_order.id, v_to::text, v_message, 'admin', v_admin_name);

  return jsonb_build_object('status', v_to, 'payment_status', v_order.payment_status);
end;
$$;

-- ---------- 2. Rate limit create_order ----------
-- Kolom internal, tidak pernah dikembalikan ke customer.
alter table public.orders
  add column device_id      text,
  add column client_ip_hash text;

create index orders_device_recent_idx on public.orders (device_id, created_at)
  where device_id is not null;
create index orders_ip_recent_idx on public.orders (client_ip_hash, created_at)
  where client_ip_hash is not null;

-- IP asli customer dari header yang diteruskan gateway Supabase ke PostgREST.
-- Disimpan sebagai hash, bukan IP mentah.
create or replace function public.request_ip_hash()
returns text
language sql
stable
set search_path = ''
as $$
  select md5(ip)
  from (
    select nullif(btrim(split_part(
      coalesce(
        current_setting('request.headers', true)::json ->> 'x-forwarded-for',
        current_setting('request.headers', true)::json ->> 'x-real-ip',
        ''
      ), ',', 1)), '') as ip
  ) h
  where ip is not null;
$$;

revoke all on function public.request_ip_hash() from public, anon, authenticated;

drop function public.create_order(text, uuid, jsonb, text);

create function public.create_order(
  customer_name  text,
  pickup_slot_id uuid,
  items          jsonb,
  note           text default null,
  device_id      text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  -- Batas anti spam. Ubah di sini kalau perlu.
  c_device_limit constant integer := 3;
  c_ip_limit     constant integer := 30;
  c_window       constant interval := interval '1 hour';

  v_name      text := btrim(coalesce(customer_name, ''));
  v_note      text := nullif(btrim(coalesce(note, '')), '');
  v_device    text := nullif(btrim(coalesce(device_id, '')), '');
  v_ip_hash   text := public.request_ip_hash();
  v_slot      public.pickup_slots%rowtype;
  v_used      integer;
  v_total_qty integer;
  v_total     integer;
  v_order_id  uuid;
  v_code      text;
  v_attempt   integer := 0;
  v_items     jsonb;
begin
  -- Rate limit dulu, sebelum kerja lain.
  if v_device is not null and v_device !~ '^[A-Za-z0-9-]{8,64}$' then
    raise exception 'Identitas perangkat tidak valid' using hint = 'INVALID_DEVICE';
  end if;

  if v_device is not null then
    -- Serialisasi per perangkat supaya klik beruntun paralel tidak lolos bareng.
    perform pg_advisory_xact_lock(hashtext('create_order:device:' || v_device));
    if (
      select count(*) from public.orders o
      where o.device_id = v_device and o.created_at > now() - c_window
    ) >= c_device_limit then
      raise exception 'Terlalu banyak pesanan dari perangkat ini' using hint = 'RATE_LIMITED';
    end if;
  end if;

  if v_ip_hash is not null and (
    select count(*) from public.orders o
    where o.client_ip_hash = v_ip_hash and o.created_at > now() - c_window
  ) >= c_ip_limit then
    raise exception 'Terlalu banyak pesanan dari jaringan ini' using hint = 'RATE_LIMITED';
  end if;

  if length(v_name) < 2 or length(v_name) > 30 then
    raise exception 'Nama pengambil harus 2 sampai 30 karakter'
      using hint = 'INVALID_NAME';
  end if;

  if v_note is not null and length(v_note) > 100 then
    raise exception 'Catatan maksimal 100 karakter'
      using hint = 'INVALID_NOTE';
  end if;

  if items is null or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'Keranjang masih kosong'
      using hint = 'EMPTY_ITEMS';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(items) e
    where case
            when jsonb_typeof(e) <> 'object' then true
            when jsonb_typeof(e -> 'product_id') is distinct from 'string' then true
            when jsonb_typeof(e -> 'quantity') is distinct from 'number' then true
            when (e ->> 'product_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then true
            when (e ->> 'quantity') !~ '^[1-9][0-9]{0,2}$' then true
            else false
          end
  ) then
    raise exception 'Format item pesanan tidak valid'
      using hint = 'INVALID_ITEMS';
  end if;

  select jsonb_agg(jsonb_build_object('product_id', product_id, 'quantity', quantity))
  into v_items
  from (
    select (e ->> 'product_id')::uuid as product_id,
           sum((e ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(items) e
    group by 1
  ) g;

  select sum(r.quantity) into v_total_qty
  from jsonb_to_recordset(v_items) as r(product_id uuid, quantity integer);

  if v_total_qty > 2 then
    raise exception 'Maksimal 2 crepe per pesanan'
      using hint = 'MAX_QTY';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(v_items) as r(product_id uuid, quantity integer)
    left join public.products p on p.id = r.product_id
    where p.id is null or p.is_available = false
  ) then
    raise exception 'Ada crepe yang barusan habis'
      using hint = 'PRODUCT_UNAVAILABLE';
  end if;

  select sum(r.quantity * p.price)::integer into v_total
  from jsonb_to_recordset(v_items) as r(product_id uuid, quantity integer)
  join public.products p on p.id = r.product_id;

  select * into v_slot
  from public.pickup_slots s
  where s.id = create_order.pickup_slot_id
    and s.is_active = true
  for update;

  if not found then
    raise exception 'Jam pengambilan tidak ditemukan'
      using hint = 'SLOT_NOT_FOUND';
  end if;

  if v_slot.slot_time <= public.booth_now_time() then
    raise exception 'Jam pengambilan ini sudah lewat'
      using hint = 'SLOT_PAST';
  end if;

  select count(*) into v_used
  from public.orders o
  where o.pickup_slot_id = v_slot.id
    and o.status <> 'dibatalkan';

  if v_used >= v_slot.max_orders then
    raise exception 'Slot pengambilan ini sudah penuh'
      using hint = 'SLOT_FULL';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_code := public.generate_order_code();
    begin
      insert into public.orders
        (code, customer_name, pickup_slot_id, total_price, note, device_id, client_ip_hash)
      values
        (v_code, v_name, v_slot.id, v_total, v_note, v_device, v_ip_hash)
      returning id into v_order_id;
      exit;
    exception when unique_violation then
      if v_attempt >= 20 then
        raise exception 'Gagal membuat kode pesanan, coba lagi';
      end if;
    end;
  end loop;

  insert into public.order_items (order_id, product_id, quantity, price_at_order)
  select v_order_id, r.product_id, r.quantity, p.price
  from jsonb_to_recordset(v_items) as r(product_id uuid, quantity integer)
  join public.products p on p.id = r.product_id;

  insert into public.order_events (order_id, event_type, message, actor)
  values (v_order_id, 'dibuat', 'Pesanan dibuat', 'sistem');

  return jsonb_build_object('id', v_order_id, 'code', v_code);
end;
$$;

revoke all on function public.create_order(text, uuid, jsonb, text, text) from public;
grant execute on function public.create_order(text, uuid, jsonb, text, text) to anon, authenticated;

-- ---------- 3. get_order_by_code tanpa data pribadi ----------
-- "Andi Pratama" -> "An** P*****". Pemilik pesanan tetap mengenali namanya,
-- orang yang menebak kode tidak dapat nama lengkap.
create or replace function public.mask_name(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select string_agg(
    case
      when length(w) <= 2 then left(w, 1) || repeat('*', length(w) - 1)
      else left(w, 2) || repeat('*', least(length(w) - 2, 6))
    end,
    ' ' order by n
  )
  from unnest(regexp_split_to_array(btrim(p_name), '\s+')) with ordinality as t(w, n);
$$;

create or replace function public.get_order_by_code(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'code',           o.code,
    'customer_name',  public.mask_name(o.customer_name),
    'status',         o.status,
    'payment_status', o.payment_status,
    'total_price',    o.total_price,
    'created_at',     o.created_at,
    'updated_at',     o.updated_at,
    'pickup_slot',    jsonb_build_object('id', s.id, 'slot_time', s.slot_time),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'product_id',     p.id,
               'product_name',   p.name,
               'quantity',       i.quantity,
               'price_at_order', i.price_at_order
             ) order by p.name)
      from public.order_items i
      join public.products p on p.id = i.product_id
      where i.order_id = o.id
    ), '[]'::jsonb),
    'cancel_reason', case when o.status = 'dibatalkan' then (
      select e.message
      from public.order_events e
      where e.order_id = o.id
        and e.event_type = 'dibatalkan'
      order by e.created_at desc
      limit 1
    ) end
  )
  from public.orders o
  join public.pickup_slots s on s.id = o.pickup_slot_id
  where o.code = upper(btrim(p_code));
$$;

revoke all on function public.mask_name(text) from public, anon, authenticated;
revoke all on function public.get_order_by_code(text) from public;
grant execute on function public.get_order_by_code(text) to anon, authenticated;
