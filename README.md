# ETHICS FRAME STUDIO — Kelompok 6

Galeri postcard Y2K + voting, komentar, Community Spotlight, dan panel admin, dengan backend Supabase.
Situs statis (HTML/CSS/JS, tanpa build) — bisa langsung di-host di GitHub Pages.

```
index.html            halaman publik
assets/style.css      desain (palet & tipografi dari Canva)
assets/config.js      URL + publishable key Supabase (publik), ADMIN_EMAIL opsional
assets/app.js         galeri, vote, komentar, spotlight, login anggota, ekspor PNG
assets/admin.js       panel admin (overview, postcards, Frame Studio, komentar, settings, activity)
sql/01_schema.sql     skema + RLS + fungsi + storage (non-destruktif, semua objek berawalan ef_)
sql/02_admin_setup.sql  menjadikan satu akun sebagai admin
tests/                uji RLS di Postgres lokal (stub Supabase)
```

## Setup (sekali saja)

1. **Skema** — Supabase Dashboard → SQL Editor → tempel & jalankan `sql/01_schema.sql`. Aman diulang. Hanya membuat objek `ef_*`, bucket `ef-photos`, dan policy storage untuk bucket itu; tabel/aplikasi lain di project (mis. kuesioner) tidak disentuh.
2. **Akun admin** — Authentication → Users → *Add user* (email + password kuat, centang *Auto Confirm*). Password hanya disimpan Supabase Auth.
3. Buka `sql/02_admin_setup.sql`, ganti `GANTI-DENGAN-EMAIL-ADMIN@contoh.com` dengan email tadi, jalankan. Hasil verifikasi harus 1 baris.
4. *(Opsional)* isi `ADMIN_EMAIL` di `assets/config.js` agar modal admin hanya meminta password. Email itu publik dan tidak memberi akses tanpa password + baris di `ef_admins`.
5. **Authentication → URL Configuration**: isi *Site URL* dengan alamat situs (mis. `https://<user>.github.io/<repo>/`) supaya tautan konfirmasi email kembali ke situs.
6. **Authentication → Providers**: sebaiknya biarkan *Anonymous sign-ins* mati. Kalaupun menyala, akun anonymous ditolak database untuk vote/komentar.
7. Masuk lewat tombol **Admin** → tab **Postcards** → *Edit* tiap anggota → unggah foto asli (JPG/PNG/WebP, maks 5 MB). Foto tidak pernah diubah otomatis.
8. **QR code**: isi `SITE_URL` di `assets/config.js` dengan alamat GitHub Pages (mis. `https://<user>.github.io/<repo>/`). QR di setiap postcard (dan di PNG unduhan) mengarah ke `SITE_URL#card/<slug>`. Jika kosong, memakai alamat halaman saat QR dibuat — jangan unduh dari `localhost`/preview. QR dibuat di browser (pustaka `assets/qr.js`, MIT), tanpa layanan luar.
9. Deploy: push folder ini ke GitHub, aktifkan Pages.

## Data asli yang dijaga
Seed hanya berisi 8 anggota dari desain Canva (nama, username, mood, preset frame, teks border "Farfalla" milik Anisa). Foto **sengaja kosong** (tampil "PHOTO PENDING") karena gambar `canva://` tidak bisa diekspor otomatis — unggah dari panel admin. `on conflict do nothing` berarti menjalankan ulang skema tidak menimpa data yang sudah Anda ubah.

## Cara kerja keamanan
- Hak admin = baris di `ef_admins` (hanya bisa diisi lewat SQL Editor). Bukan metadata user, bukan variabel di frontend.
- Setiap operasi admin dipaksa oleh RLS / fungsi `security definer` di database. Menyembunyikan tombol bukan kontrol akses.
- Vote: constraint `unique(profile_id, user_id)`; mematikan voting/komentar di Settings ditolak langsung oleh policy database.
- Komentar: panjang 1–500, anti-spam 5/menit/user, penulis hanya bisa mengubah kolom `body`; status moderasi hanya lewat RPC admin; komentar `hidden`/`pending` tidak terbaca publik. Semua teks dirender dengan `textContent`.
- Warna frame divalidasi `#RRGGBB` di database (tidak ada injeksi CSS); `photo_url` harus `https://`.
- Tidak ada trigger di `auth.users`, tidak ada email di tabel publik; nama tampilan dipilih pengguna.
- Audit (`ef_audit`) ditulis trigger server; tidak mencatat password/token.
- Sesi admin otomatis berakhir setelah 30 menit tanpa aktivitas (`ADMIN_IDLE_MINUTES`).
- Hanya kunci publik di `config.js`. **Jangan** pernah menaruh `service_role`/secret key di repo ini.

## Kebijakan retensi
- **Arsipkan** postcard = disembunyikan dari publik, vote & komentar tetap tersimpan (bisa dipulihkan).
- **Hapus** postcard = permanen, vote & komentarnya ikut terhapus (cascade); file foto di storage tetap ada. Panel meminta konfirmasi dan menyarankan arsip.
- Mengganti foto tidak menghapus file lama.

## Frame Studio
Perubahan frame bersifat **draft** sampai tombol *Save Changes*. Frame adalah preset **global**: menyimpannya mengubah semua postcard yang memakainya. Untuk menata satu postcard saja: *Duplicate Frame* → ubah warna → pasang salinan itu di Postcards → Edit.
Arti kolom: *background/border/star* menggambar bingkai; *accent* = chip MOOD & garis; *primary text* = nama/quote (ada peringatan kontras); *shadow* = bayangan kartu terpilih.

## Pengujian
```
PGHOST=... PGPORT=... PGUSER=postgres ./tests/run.sh     # butuh Postgres lokal; BUKAN Supabase asli
```
Menjalankan skema dua kali (cek idempoten) lalu 148 pengecekan izin/RLS: anon vs member vs admin, vote ganda & atas nama orang lain, feature flag, moderasi, spam, validasi warna/URL, storage, eksposur fungsi.

## Batasan yang perlu Anda ketahui
- Skema & RLS diuji pada Postgres 16 dengan **stub** Supabase; UI diuji di browser dengan **API tiruan**. Belum dijalankan terhadap project Supabase asli (sandbox tidak bisa menjangkaunya). Setelah setup, coba alur ini sekali: daftar → vote → komentar → login admin → simpan frame.
- Realtime komentar memakai `supabase_realtime`; jika tidak aktif, galeri tetap menyegarkan diri tiap 60 detik.
- Skrip supabase-js dipasang dengan SRI. Jika CDN menyajikan berkas berbeda, hapus atribut `integrity` di `index.html` atau hosting salinan lokal.
- Ekspor gambar memakai canvas; foto dari domain lain harus mengizinkan CORS (bucket Supabase mengizinkan). Jika gagal, gambar tetap diunduh tanpa foto dan Anda diberi tahu.
