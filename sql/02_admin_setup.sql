-- =====================================================================
-- ETHICS FRAME STUDIO — Setup akun admin (jalankan SETELAH 01_ethics_frame_studio.sql)
--
-- LANGKAH:
-- 1. Supabase Dashboard > Authentication > Users > Add user > Create new user
--    Isi email + password admin, centang "Auto Confirm User".
--    (Password hanya ada di Supabase Auth; tidak pernah ditulis di kode/tabel.)
-- 2. Ganti email di bawah dengan email admin tadi, lalu jalankan.
-- 3. Isi CONFIG.ADMIN_EMAIL di index.html dengan email yang sama
--    kalau ingin modal admin hanya meminta password.
-- =====================================================================

insert into public.ef_admins (user_id)
select id from auth.users
where email = 'GANTI-DENGAN-EMAIL-ADMIN@contoh.com'
on conflict (user_id) do nothing;

-- Verifikasi (harus mengembalikan 1 baris):
select a.user_id, u.email from public.ef_admins a join auth.users u on u.id = a.user_id;

-- Untuk mencabut akses admin:
-- delete from public.ef_admins where user_id = (select id from auth.users where email = '...');
