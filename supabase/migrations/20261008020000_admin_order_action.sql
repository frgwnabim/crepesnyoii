-- =========================================================
-- CrepeNyoii: aksi admin pada pesanan
-- - order_events.actor_name: nama admin yang melakukan aksi
-- - admin_order_action: ubah status / status bayar + catat event dalam 1 transaksi
--
-- Aksi dan transisi yang diizinkan:
--   konfirmasi : menunggu_konfirmasi -> dikonfirmasi
--   siapkan    : dikonfirmasi        -> disiapkan
--   siap       : disiapkan           -> siap_diambil
--   selesai    : siap_diambil        -> selesai      (wajib sudah lunas)
--   lunas      : belum_bayar         -> lunas        (pesanan belum selesai/dibatalkan)
--   batalkan   : status aktif apa pun -> dibatalkan  (wajib alasan)
--
-- Error membawa HINT: NOT_AUTHENTICATED, INVALID_ACTION, NOT_FOUND,
--   INVALID_TRANSITION, NOT_PAID, REASON_REQUIRED
-- =========================================================

alter table public.order_events add column actor_name text;

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
  v_event_type text;
  v_message    text;
begin
  if auth.uid() is null then
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

  -- Kunci baris supaya dua admin yang klik bersamaan tidak saling timpa.
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan' using hint = 'NOT_FOUND';
  end if;

  -- ---------- Status bayar ----------
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

  -- ---------- Status pesanan ----------
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
      -- Konvensi get_order_by_code: message event 'dibatalkan' = alasan pembatalan.
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

  v_event_type := v_to::text;

  update public.orders set status = v_to where id = v_order.id;

  insert into public.order_events (order_id, event_type, message, actor, actor_name)
  values (v_order.id, v_event_type, v_message, 'admin', v_admin_name);

  return jsonb_build_object('status', v_to, 'payment_status', v_order.payment_status);
end;
$$;

revoke all on function public.admin_order_action(uuid, text, text) from public, anon;
grant execute on function public.admin_order_action(uuid, text, text) to authenticated;
