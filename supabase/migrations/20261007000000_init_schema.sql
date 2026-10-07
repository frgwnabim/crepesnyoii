-- =========================================================
-- CrepeNyoii: skema awal
-- Tabel, enum, constraint, trigger, RLS, dan RPC get_order_by_code.
-- RPC create_order dibuat di migration terpisah.
-- =========================================================

-- ---------- Enum ----------
create type public.order_status as enum (
  'menunggu_konfirmasi',
  'dikonfirmasi',
  'disiapkan',
  'siap_diambil',
  'selesai',
  'dibatalkan'
);

create type public.payment_status as enum ('belum_bayar', 'lunas');

create type public.event_actor as enum ('sistem', 'admin');

-- ---------- Tabel ----------
create table public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  price        integer not null check (price >= 0), -- rupiah
  image_url    text,
  is_available boolean not null default true,
  created_at   timestamptz not null default now()
);

create table public.pickup_slots (
  id         uuid primary key default gen_random_uuid(),
  slot_time  time not null unique,
  max_orders integer not null default 10 check (max_orders >= 0),
  is_active  boolean not null default true
);

create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  -- NYO-XXXX, tanpa karakter ambigu 0/O/1/I
  code           text not null unique check (code ~ '^NYO-[A-HJ-NP-Z2-9]{4}$'),
  customer_name  text not null check (length(btrim(customer_name)) > 0),
  pickup_slot_id uuid not null references public.pickup_slots (id),
  status         public.order_status not null default 'menunggu_konfirmasi',
  payment_status public.payment_status not null default 'belum_bayar',
  total_price    integer not null default 0 check (total_price >= 0),
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index orders_pickup_slot_id_idx on public.orders (pickup_slot_id);
create index orders_status_idx on public.orders (status);

create table public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  product_id     uuid not null references public.products (id),
  quantity       integer not null check (quantity between 1 and 2),
  price_at_order integer not null check (price_at_order >= 0)
);

create index order_items_order_id_idx on public.order_items (order_id);

create table public.order_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  event_type text not null,
  message    text,
  actor      public.event_actor not null default 'sistem',
  created_at timestamptz not null default now()
);

create index order_events_order_id_idx on public.order_events (order_id, created_at);

-- ---------- Helper: generate kode NYO-XXXX ----------
-- Hanya menghasilkan kandidat. Pemanggil (create_order) wajib cek/tangani bentrok unique.
create or replace function public.generate_order_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'NYO-';
begin
  for i in 1..4 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

-- ---------- Trigger: updated_at ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- ---------- Trigger: maksimal 2 crepe per pesanan ----------
create or replace function public.check_order_items_quantity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  total_qty integer;
begin
  -- Kunci baris order supaya insert item paralel ke order yang sama tidak lolos bareng.
  perform 1 from public.orders where id = new.order_id for update;

  select coalesce(sum(quantity), 0) into total_qty
  from public.order_items
  where order_id = new.order_id
    and id <> new.id;

  if total_qty + new.quantity > 2 then
    raise exception 'Maksimal 2 crepe per pesanan'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger order_items_max_quantity
before insert or update of quantity, order_id on public.order_items
for each row execute function public.check_order_items_quantity();

-- ---------- Trigger: kapasitas slot ----------
create or replace function public.check_slot_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  slot_max integer;
  used     integer;
begin
  -- Order yang dibatalkan tidak memakan kuota.
  if new.status = 'dibatalkan' then
    return new;
  end if;

  -- Saat update, cek ulang hanya jika slot berubah atau order "dihidupkan" lagi dari dibatalkan.
  if tg_op = 'UPDATE'
     and new.pickup_slot_id = old.pickup_slot_id
     and old.status <> 'dibatalkan' then
    return new;
  end if;

  -- Kunci baris slot supaya dua order paralel tidak sama-sama mengambil kuota terakhir.
  select max_orders into slot_max
  from public.pickup_slots
  where id = new.pickup_slot_id
  for update;

  select count(*) into used
  from public.orders
  where pickup_slot_id = new.pickup_slot_id
    and status <> 'dibatalkan'
    and id <> new.id;

  if used >= slot_max then
    raise exception 'Slot pengambilan ini sudah penuh'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger orders_slot_capacity
before insert or update of pickup_slot_id, status on public.orders
for each row execute function public.check_slot_capacity();

-- ---------- Row Level Security ----------
alter table public.products     enable row level security;
alter table public.pickup_slots enable row level security;
alter table public.orders       enable row level security;
alter table public.order_items  enable row level security;
alter table public.order_events enable row level security;

-- Publik: hanya produk yang tersedia dan slot yang aktif.
create policy "Publik lihat produk tersedia"
  on public.products for select
  to anon, authenticated
  using (is_available = true);

create policy "Publik lihat slot aktif"
  on public.pickup_slots for select
  to anon, authenticated
  using (is_active = true);

-- Admin (user terautentikasi): SELECT dan UPDATE semua tabel.
create policy "Admin lihat semua produk"
  on public.products for select to authenticated using (true);
create policy "Admin ubah produk"
  on public.products for update to authenticated using (true) with check (true);

create policy "Admin lihat semua slot"
  on public.pickup_slots for select to authenticated using (true);
create policy "Admin ubah slot"
  on public.pickup_slots for update to authenticated using (true) with check (true);

create policy "Admin lihat semua order"
  on public.orders for select to authenticated using (true);
create policy "Admin ubah order"
  on public.orders for update to authenticated using (true) with check (true);

create policy "Admin lihat semua item order"
  on public.order_items for select to authenticated using (true);
create policy "Admin ubah item order"
  on public.order_items for update to authenticated using (true) with check (true);

create policy "Admin lihat semua event order"
  on public.order_events for select to authenticated using (true);
create policy "Admin ubah event order"
  on public.order_events for update to authenticated using (true) with check (true);

-- Tidak ada policy INSERT/DELETE untuk anon: order customer masuk lewat RPC create_order.

-- ---------- RPC: lihat order lewat kode ----------
-- security definer supaya customer (anon) bisa baca SATU order tanpa akses ke tabel orders.
create or replace function public.get_order_by_code(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'code',           o.code,
    'customer_name',  o.customer_name,
    'status',         o.status,
    'payment_status', o.payment_status,
    'total_price',    o.total_price,
    'note',           o.note,
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
    ), '[]'::jsonb)
  )
  from public.orders o
  join public.pickup_slots s on s.id = o.pickup_slot_id
  where o.code = upper(btrim(p_code));
$$;

revoke all on function public.get_order_by_code(text) from public;
grant execute on function public.get_order_by_code(text) to anon, authenticated;

-- Fungsi internal: jangan bisa dipanggil langsung lewat API.
revoke all on function public.generate_order_code() from public, anon, authenticated;
revoke all on function public.check_order_items_quantity() from public, anon, authenticated;
revoke all on function public.check_slot_capacity() from public, anon, authenticated;
