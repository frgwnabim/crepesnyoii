-- =========================================================
-- CrepeNyoii: tambah cancel_reason ke get_order_by_code
-- Konvensi: saat admin membatalkan pesanan, insert order_events dengan
-- event_type = 'dibatalkan' dan message = alasan pembatalan.
-- cancel_reason diambil dari event 'dibatalkan' paling baru.
-- =========================================================

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

revoke all on function public.get_order_by_code(text) from public;
grant execute on function public.get_order_by_code(text) to anon, authenticated;
