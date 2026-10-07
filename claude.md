# Crepe Roll Nyoii: Web Pemesanan Booth

## Konteks
Website pemesanan untuk booth "Crepe Roll Nyoii" di Binus Festival. Web ini OPSI SEKUNDER: antre langsung di booth tetap jalur utama. Web hanya untuk customer yang ingin pesan duluan dan ambil di jam tertentu.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth untuk admin, Realtime untuk notifikasi)
- Deploy ke Vercel

## Aturan bisnis (WAJIB dipatuhi)
1. TIDAK ADA pembayaran online. Pembayaran selalu di kasir booth. Admin yang menandai status bayar.
2. Maksimal 2 crepe per pesanan (total quantity semua item, bukan per varian).
3. Customer wajib isi nama dan memilih jam pengambilan.
4. Setiap pesanan dapat kode unik (format NYO-XXXX, 4 karakter huruf kapital + angka, tanpa karakter ambigu seperti 0/O/1/I). Kode inilah identitas utama, bukan nama.
5. Customer tidak perlu login/membuat akun.
6. Status pesanan: menunggu_konfirmasi -> dikonfirmasi -> disiapkan -> siap_diambil -> selesai. Ada juga dibatalkan.
7. Status bayar terpisah: belum_bayar / lunas.

## Desain
- Customer: mobile-first, warna pastel hangat (cream #FFF6EC sebagai background, pink #F28FA8 untuk tombol utama, coklat #6B3A2E untuk teks heading), sudut rounded, card-based.
- Admin: desktop-first, sidebar gelap, konten terang, badge warna per status.
- Bahasa UI: Indonesia, santai dan ramah.
- Jangan pakai karakter em dash di teks UI.

## Cara kerja
- Kerjakan per fitur, jangan menyentuh fitur lain yang tidak diminta.
- Setelah selesai, jelaskan singkat file apa saja yang diubah dan cara mengetesnya.
