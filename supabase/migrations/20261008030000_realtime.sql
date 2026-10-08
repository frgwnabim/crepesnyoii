-- =========================================================
-- CrepeNyoii: realtime
--
-- ADMIN: postgres_changes di tabel orders. Admin = authenticated dan RLS
-- mengizinkan SELECT, jadi Realtime boleh mengirim perubahan baris ke admin.
--
-- CUSTOMER: anon tidak bisa SELECT orders, jadi postgres_changes tidak jalan.
-- Sebagai gantinya trigger di bawah mem-broadcast ke channel publik
-- "order:NYO-XXXX" lewat realtime.send() (fitur "Broadcast from Database").
-- Dipilih karena paling sederhana: tidak perlu pg_net / HTTP call, tidak
-- bergantung dari mana perubahan datang (RPC admin, SQL editor, dsb), dan
-- berjalan di transaksi yang sama sehingga tidak ada broadcast untuk update
-- yang gagal.
-- Isi broadcast hanya status, tidak ada nama/item. Channel bisa didengar
-- siapa pun yang tahu kodenya, setara dengan akses get_order_by_code.
-- =========================================================

alter publication supabase_realtime add table public.orders;

create or replace function public.broadcast_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     or new.payment_status is distinct from old.payment_status then
    begin
      perform realtime.send(
        jsonb_build_object(
          'code',           new.code,
          'status',         new.status,
          'payment_status', new.payment_status,
          'updated_at',     new.updated_at
        ),
        'status_changed',        -- event
        'order:' || new.code,    -- topic
        false                    -- channel publik (customer tidak login)
      );
    exception when others then
      -- Broadcast gagal tidak boleh menggagalkan update pesanan.
      -- Customer tetap dapat status terbaru lewat polling fallback.
      raise warning 'broadcast_order_status gagal: %', sqlerrm;
    end;
  end if;
  return new;
end;
$$;

create trigger orders_broadcast_status
after update of status, payment_status on public.orders
for each row execute function public.broadcast_order_status();

revoke all on function public.broadcast_order_status() from public, anon, authenticated;
