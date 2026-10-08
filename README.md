# Crepe Roll Nyoii: Web Pemesanan Booth

Web pemesanan untuk booth **Crepe Roll Nyoii** di Binus Festival. Customer bisa pesan duluan dan ambil di jam tertentu; antre langsung di booth tetap jalur utama. Tidak ada pembayaran online, semua bayar di kasir.

- **Customer** (tanpa login): `/` → `/pesan` → `/pesan/jam` → `/pesan/konfirmasi` → `/pesanan/NYO-XXXX`, plus `/cek` untuk cari pesanan pakai kode.
- **Admin** (login): `/admin` dashboard pesanan hari ini, `/admin/pesanan/[id]`, `/admin/menu`, `/admin/slot`.

Stack: Next.js 16 (App Router, Cache Components) + TypeScript, Tailwind CSS 4, Supabase (Postgres, Auth, Realtime, Storage), deploy ke Vercel.

---

## 1. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com/dashboard). Pilih region **Southeast Asia (Singapore)** supaya dekat.
2. Buka **Project Settings → API**, catat **Project URL** dan **anon public key**.
3. Di folder project, salin env:

   ```bash
   cp .env.local.example .env.local
   ```

   lalu isi:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

   Hanya anon key yang dipakai. **Jangan** taruh `service_role` key di project ini.

4. Pengaturan dashboard yang wajib dicek:
   - **Authentication → Sign In / Providers → "Allow new users to sign up": MATIKAN.** Admin dibuat manual. (Walau lupa dimatikan, user baru tetap bukan admin karena ada allowlist `admin_users`, tapi lebih aman dimatikan.)
   - **Realtime → Settings → "Allow public access": NYALAKAN.** Halaman pesanan customer mendengarkan channel publik `order:NYO-XXXX`.

## 2. Menjalankan migration dan seed

Migration ada di `supabase/migrations/` dan **harus dijalankan berurutan**:

| File | Isi |
| --- | --- |
| `20261007000000_init_schema.sql` | Tabel, enum, trigger (maks 2 crepe, kapasitas slot), RLS dasar, `get_order_by_code` |
| `20261008000000_create_order_rpc.sql` | `create_order`, `get_pickup_slots` |
| `20261008010000_order_cancel_reason.sql` | Alasan batal di `get_order_by_code` |
| `20261008020000_admin_order_action.sql` | `admin_order_action` + `order_events.actor_name` |
| `20261008030000_realtime.sql` | Publication realtime + trigger broadcast status ke customer |
| `20261008040000_admin_menu_slot.sql` | Produk habis tetap terlihat, bucket Storage `product-images` |
| `20261008050000_hardening.sql` | Allowlist admin, rate limit, nama disamarkan di jalur publik |

**Cara A: Supabase CLI (disarankan)**

```bash
npx supabase login
npx supabase link --project-ref <project-ref>   # project-ref ada di URL dashboard
npx supabase db push                            # menjalankan semua migration yang belum jalan
```

**Cara B: SQL Editor**

Buka **SQL Editor**, lalu jalankan isi tiap file migration **satu per satu sesuai urutan tabel di atas**.

**Seed data** (3 produk contoh + slot 10.00 sampai 17.00 tiap 30 menit): jalankan isi `supabase/seed.sql` di SQL Editor. Seed aman dijalankan ulang untuk slot, tapi produk akan dobel kalau dijalankan dua kali.

## 3. Membuat akun admin

Tidak ada halaman register. Untuk setiap admin:

1. **Authentication → Users → Add user → Create new user.** Isi email + password, centang **Auto Confirm User**.
2. Di **SQL Editor**, daftarkan sebagai admin dan beri nama tampilan (nama ini muncul di sidebar dan di log aktivitas pesanan):

   ```sql
   -- ganti email dan nama
   update auth.users
   set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"name": "Kak Rina"}'
   where email = 'rina@contoh.com';

   insert into public.admin_users (user_id)
   select id from auth.users where email = 'rina@contoh.com';
   ```

3. Login di `/admin/login`. Akun yang login tapi tidak ada di `admin_users` akan ditolak ("Akun ini belum terdaftar sebagai admin booth").

Mencabut admin: `delete from public.admin_users where user_id = (select id from auth.users where email = '...');`

## 4. Menjalankan di lokal

Butuh Node.js 20 atau lebih baru.

```bash
npm install
npm run dev
```

Buka `http://localhost:3000` (customer) dan `http://localhost:3000/admin` (admin).

Perintah lain: `npm run lint`, `npm run build`.

## 5. Deploy ke Vercel

1. Push repo ke GitHub.
2. Di [vercel.com/new](https://vercel.com/new), **Import** repo ini. Framework terdeteksi otomatis sebagai Next.js; build command dan output tidak perlu diubah.
3. Di **Environment Variables**, tambahkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` (untuk Production dan Preview).
4. **Deploy.**
5. Di Supabase **Authentication → URL Configuration**, set **Site URL** ke domain Vercel (misal `https://crepenyoii.vercel.app`).
6. Buka domain tersebut di HP dan coba alur lengkap (lihat checklist di bawah).

Kalau mengganti env di Vercel, lakukan **Redeploy**, karena variabel `NEXT_PUBLIC_*` ditanam saat build.

---

## Keamanan

### Ringkasan RLS

| Siapa | Bisa | Tidak bisa |
| --- | --- | --- |
| Customer (anon) | Lihat semua produk, lihat slot aktif, `create_order`, `get_order_by_code` (nama disamarkan, tanpa catatan), `get_pickup_slots`, dengar broadcast `order:KODE` | Baca tabel `orders` / `order_items` / `order_events`, insert/update/delete apa pun langsung, panggil fungsi admin, upload ke Storage |
| User login tapi bukan admin | Sama seperti customer | Semua aksi admin (diblokir `is_admin()`) |
| Admin (`admin_users`) | Baca semua data, ubah produk/slot, `admin_order_action`, upload foto produk | Hapus pesanan (tidak ada policy DELETE) |

Semua perubahan status pesanan lewat `admin_order_action`, yang memvalidasi transisi di database dan mencatat `order_events` dengan nama admin.

### Anti spam (rate limit `create_order`)

- **Per perangkat:** maks **3 pesanan per jam**. Browser menyimpan ID acak di localStorage (`crepenyoii:device-id`) dan mengirimnya ke `create_order`; database menghitung pesanan dengan ID itu dalam 1 jam terakhir.
- **Per IP:** maks **30 pesanan per jam**, dari header `x-forwarded-for` yang diteruskan Supabase. Disimpan sebagai hash, bukan IP mentah.
- Angka batas ada di awal fungsi `create_order` (`c_device_limit`, `c_ip_limit`) di migration hardening.

Trade-off:

- **ID perangkat mudah diakali**: hapus data browser, mode incognito, atau panggil API langsung tanpa ID. Ini hanya menahan spam iseng dan klik berulang, bukan penyerang yang niat.
- Karena itu ada **batas IP** sebagai jaring kedua. Batasnya sengaja longgar (30) karena di festival banyak customer berbagi satu IP (wifi kampus, NAT operator seluler). Kalau dibuat ketat, customer jujur ikut terblokir.
- Pesanan yang dibatalkan **tetap dihitung**, supaya spammer tidak dapat kuota lagi setelah admin membatalkan pesanannya. Konsekuensinya customer yang pesanannya dibatalkan (misal stok habis) punya jatah lebih sedikit di jam itu.
- Pertahanan terakhir tetap ada: kuota per slot, maks 2 crepe, dan admin bisa konfirmasi/batalkan manual. Kalau spam parah, admin bisa **Tutup pemesanan web** di `/admin/slot`.
- Untuk perlindungan lebih kuat (CAPTCHA seperti Cloudflare Turnstile, atau verifikasi nomor HP) perlu tambahan layanan dan langkah ekstra bagi customer; belum dipasang demi kesederhanaan.

### Kode pesanan bisa ditebak

Kode `NYO-XXXX` hanya punya ~1 juta kombinasi. Siapa pun bisa mencoba-coba kode di `/cek`. Karena itu jalur publik **tidak** mengembalikan nama lengkap (misal "Andi Pratama" jadi "An** Pr*****") dan **tidak** mengembalikan catatan pesanan. Yang terlihat hanya status, item, total, dan jam ambil. Admin tetap melihat data lengkap.

## Keterbatasan notifikasi realtime

- Notifikasi customer **hanya jalan selama tab masih terbuka** di HP (belum ada Web Push dari server). Saat tab dibuka lagi, status langsung disusulkan.
- iPhone hanya bisa notifikasi browser kalau situs di-"Add to Home Screen" (iOS 16.4+); getar tidak didukung di iOS.
- Suara notifikasi admin baru bisa bunyi setelah admin klik sesuatu di halaman (aturan autoplay browser).
- Kalau realtime putus, halaman beralih ke polling tiap 20 detik dan menampilkan "Menyambung ulang".

## Struktur folder

```
app/                   Halaman (App Router)
  admin/(panel)/       Panel admin dengan sidebar
  admin/login/         Login admin
  pesan/, pesanan/     Alur customer
components/            Komponen UI (admin/, pesan/, pesanan/, cart/, ui/)
lib/                   Helper (supabase client, format, notifikasi, auth admin)
supabase/migrations/   Skema database, RLS, RPC
supabase/seed.sql      Data contoh
public/sw.js           Service worker untuk notifikasi di HP
public/sounds/         Suara pesanan baru
```

---

## Checklist testing manual end to end

Siapkan: 1 laptop/tablet untuk admin, 1 HP untuk customer. Pastikan ada slot yang jamnya **belum lewat** (kalau tes malam hari, tambahkan dulu: `insert into pickup_slots (slot_time, max_orders) values ('23:30', 10);`).

**Persiapan admin**

- [ ] Login di `/admin/login` dengan akun admin. Nama admin tampil di sidebar.
- [ ] Indikator sidebar "Realtime aktif" (titik hijau).
- [ ] Klik **Aktifkan notifikasi**, izinkan di browser.
- [ ] Toggle suara ON. Klik di mana saja di halaman sekali (agar suara boleh bunyi).

**1. Customer pesan**

- [ ] Di HP buka `/`, tombol **Pesan Sekarang** tampil (pemesanan web terbuka).
- [ ] `/pesan`: tambah 2 crepe. Tombol + semua nonaktif, muncul info "Maksimal 2 crepe per pesanan...".
- [ ] Footer: jumlah dan total benar (format `Rp33.000`). Lanjut ke jam ambil.
- [ ] `/pesan/jam`: slot lewat/penuh tidak bisa dipilih. Pilih satu, muncul "Dipilih: 23.30, sisa X pesanan".
- [ ] `/pesan/konfirmasi`: isi nama (coba 1 huruf dulu, harus ditolak), isi catatan, ringkasan benar, ada info "Pembayaran dilakukan di kasir saat pengambilan."
- [ ] **Kirim Pesanan**. Diarahkan ke `/pesanan/NYO-XXXX`, judul "Yay, crepe-mu diamankan!", QR dan tombol salin berfungsi.
- [ ] Klik **Kabari aku kalau sudah siap**, izinkan notifikasi.

**2. Admin dapat notifikasi**

- [ ] Di admin muncul toast "Pesanan baru NYO-XXXX dari ..., ambil 23.30" + tombol **Lihat**, dan suara berbunyi.
- [ ] Badge merah angka muncul di menu Pesanan, kartu "Perlu konfirmasi" merah dan bertambah.
- [ ] Baris pesanan muncul di tabel tanpa refresh.
- [ ] Ulangi dengan tab admin di background: notifikasi browser muncul.

**3. Admin konfirmasi → customer dapat notifikasi**

- [ ] Klik **Konfirmasi** (dari tabel atau detail). Badge status berubah hijau muda, angka badge menu berkurang.
- [ ] Di HP, timeline langkah 2 aktif tanpa refresh dan muncul toast "Pesananmu sudah dikonfirmasi!".
- [ ] Klik **Mulai Siapkan**. HP: toast "Crepe-mu sedang disiapkan!".

**4. Siap diambil**

- [ ] Klik **Tandai Siap Diambil**. HP: toast pink besar "Crepe-mu siap! Tunjukkan kode NYO-XXXX di booth.", HP bergetar (Android), notifikasi browser muncul.
- [ ] Di admin tombol **Selesai** masih nonaktif + peringatan "Pastikan customer sudah bayar di kasir."

**5. Tandai lunas**

- [ ] Klik **Tandai Lunas**. Badge bayar "Lunas" di admin, HP menampilkan "Lunas" dan toast "Pembayaran diterima".

**6. Selesai**

- [ ] Klik **Selesai**. Semua langkah timeline di HP centang hijau, judul "Selamat menikmati!".
- [ ] Detail pesanan admin: card **Aktivitas order** berisi semua langkah dengan nama admin, header "diperbarui ... oleh ...".

**Kasus tambahan**

- [ ] **Batal:** buat pesanan baru, **Batalkan** dengan alasan "Stok habis". HP menampilkan kotak merah berisi alasan.
- [ ] **Rate limit:** dari HP yang sama buat 3 pesanan; pesanan ke-4 dalam 1 jam ditolak dengan pesan ramah.
- [ ] **Slot penuh:** set kuota slot = 1 di `/admin/slot`, buka konfirmasi di 2 tab, kirim keduanya. Tab kedua dapat "jam ambil ini keburu penuh" + tombol pilih jam lain.
- [ ] **Stok habis realtime:** saat HP di `/pesan` dengan produk di keranjang, toggle produk itu jadi Habis di `/admin/menu`. Di HP produk jadi abu-abu, keluar dari keranjang, ada toast.
- [ ] **Tutup pemesanan web:** klik di `/admin/slot`. Landing HP menampilkan "Pemesanan via web sedang ditutup, silakan antre langsung di booth ya!". Buka lagi setelahnya.
- [ ] **Koneksi putus:** matikan wifi HP sebentar di halaman pesanan. Muncul "Menyambung ulang", status menyusul setelah online.
- [ ] **Pengingat oranye:** pesanan dikonfirmasi dengan jam ambil ≤ 10 menit lagi tampil oranye di dashboard.
- [ ] **Keamanan:** buka `/admin` di browser lain tanpa login, harus dilempar ke login. Cek `/cek` dengan kode orang lain: nama tampil tersamar.
- [ ] **Tampilan:** HP lebar 360px tidak ada scroll ke samping; admin di tablet portrait (768px) dan landscape (1024px) tabel muat tanpa scroll.
- [ ] **404:** buka `/ngasal`, muncul halaman 404 bertema booth.
