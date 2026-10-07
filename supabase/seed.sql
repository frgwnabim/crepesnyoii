-- Seed data CrepeNyoii (harga contoh, silakan disesuaikan)

insert into public.products (name, description, price, is_available) values
  ('Original',   'Crepe roll klasik, renyah di luar, lembut di dalam.', 15000, true),
  ('Berry',      'Crepe roll dengan saus berry segar yang manis asam.', 18000, true),
  ('Choco Oreo', 'Crepe roll coklat dengan taburan Oreo yang melimpah.', 20000, true);

-- Slot setiap 30 menit dari 10.00 sampai 17.00 (15 slot)
insert into public.pickup_slots (slot_time, max_orders, is_active)
select t::time, 10, true
from generate_series(
  timestamp '2000-01-01 10:00',
  timestamp '2000-01-01 17:00',
  interval '30 minutes'
) as t
on conflict (slot_time) do nothing;
