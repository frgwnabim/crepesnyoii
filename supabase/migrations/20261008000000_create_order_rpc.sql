-- =========================================================
-- CrepeNyoii: RPC untuk alur pemesanan customer
-- - get_pickup_slots: slot aktif + kuota terpakai (anon tidak bisa baca tabel orders)
-- - create_order: validasi ulang di server lalu buat pesanan
--
-- Error dari create_order selalu membawa HINT berisi kode mesin supaya
-- client bisa menampilkan pesan yang ramah:
--   INVALID_NAME, INVALID_NOTE, EMPTY_ITEMS, INVALID_ITEMS, MAX_QTY,
--   PRODUCT_UNAVAILABLE, SLOT_NOT_FOUND, SLOT_PAST, SLOT_FULL
-- =========================================================

-- Jam booth mengikuti WIB.
create or replace function public.booth_now_time()
returns time
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Jakarta')::time;
$$;

-- ---------- RPC: daftar slot + ketersediaan ----------
create or replace function public.get_pickup_slots()
returns table (
  id         uuid,
  slot_time  time,
  max_orders integer,
  used_count integer,
  remaining  integer,
  is_past    boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    s.slot_time,
    s.max_orders,
    coalesce(u.used, 0)::integer                          as used_count,
    greatest(s.max_orders - coalesce(u.used, 0), 0)::integer as remaining,
    s.slot_time <= public.booth_now_time()                as is_past
  from public.pickup_slots s
  left join (
    select pickup_slot_id, count(*) as used
    from public.orders
    where status <> 'dibatalkan'
    group by pickup_slot_id
  ) u on u.pickup_slot_id = s.id
  where s.is_active = true
  order by s.slot_time;
$$;

-- ---------- RPC: buat pesanan ----------
create or replace function public.create_order(
  customer_name  text,
  pickup_slot_id uuid,
  items          jsonb,
  note           text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_name      text := btrim(coalesce(customer_name, ''));
  v_note      text := nullif(btrim(coalesce(note, '')), '');
  v_slot      public.pickup_slots%rowtype;
  v_used      integer;
  v_total_qty integer;
  v_total     integer;
  v_order_id  uuid;
  v_code      text;
  v_attempt   integer := 0;
  v_items     jsonb;
begin
  -- Nama dan catatan
  if length(v_name) < 2 or length(v_name) > 30 then
    raise exception 'Nama pengambil harus 2 sampai 30 karakter'
      using hint = 'INVALID_NAME';
  end if;

  if v_note is not null and length(v_note) > 100 then
    raise exception 'Catatan maksimal 100 karakter'
      using hint = 'INVALID_NOTE';
  end if;

  -- Item: format [{ "product_id": uuid, "quantity": int }]
  if items is null or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'Keranjang masih kosong'
      using hint = 'EMPTY_ITEMS';
  end if;

  -- CASE dipakai supaya cast hanya jalan setelah format lolos dicek.
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

  -- Gabungkan produk yang sama supaya tidak bisa diakali dengan baris duplikat.
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

  -- Semua produk harus ada dan tersedia. Harga diambil dari database.
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

  -- Slot: kunci barisnya supaya dua pesanan paralel tidak sama-sama ambil kuota terakhir.
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

  -- Insert order, ulangi generate kode kalau bentrok.
  loop
    v_attempt := v_attempt + 1;
    v_code := public.generate_order_code();
    begin
      insert into public.orders (code, customer_name, pickup_slot_id, total_price, note)
      values (v_code, v_name, v_slot.id, v_total, v_note)
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

-- ---------- Hak akses ----------
revoke all on function public.booth_now_time() from public, anon, authenticated;

revoke all on function public.get_pickup_slots() from public;
grant execute on function public.get_pickup_slots() to anon, authenticated;

revoke all on function public.create_order(text, uuid, jsonb, text) from public;
grant execute on function public.create_order(text, uuid, jsonb, text) to anon, authenticated;
