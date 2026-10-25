-- Uji RLS / izin Ethics Frame Studio. Dijalankan SETELAH 00_supabase_stub.sql dan sql/01_schema.sql.
-- Tiap pengecekan menulis satu baris ke t.results; ringkasan ada di akhir.
\set ON_ERROR_STOP on
create schema t;
grant usage on schema t to public;
create table t.u (name text primary key, id uuid not null);
create table t.results (n serial primary key, name text, ok boolean, detail text);
grant select on t.u to public;
grant all on t.results to public;
grant usage, select on sequence t.results_n_seq to public;

create function t.check(nm text, ok boolean, detail text default null) returns void
language sql as $$ insert into t.results(name, ok, detail) values (nm, coalesce(ok, false), detail) $$;

create function t.login(uid uuid, anon boolean default false) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'is_anonymous', anon)::text, false);
  execute 'set role authenticated';
end $$;
create function t.visitor() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', false);
  execute 'set role anon';
end $$;
create function t.back() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', false);
end $$;

-- Pernyataan harus GAGAL dengan salah satu sqlstate
create function t.expect_err(nm text, q text, codes text[]) returns void language plpgsql as $$
begin
  begin
    execute q;
    perform t.check(nm, false, 'tidak ada error (seharusnya ditolak)');
  exception when others then
    perform t.check(nm, sqlstate = any(codes), sqlstate || ' ' || sqlerrm);
  end;
end $$;
-- Pernyataan harus berhasil dan mempengaruhi n baris
create function t.expect_rows(nm text, q text, expected int) returns void language plpgsql as $$
declare n int;
begin
  begin
    execute q;
    get diagnostics n = row_count;
    perform t.check(nm, n = expected, 'baris terpengaruh=' || n || ', harapan=' || expected);
  exception when others then
    perform t.check(nm, false, sqlstate || ' ' || sqlerrm);
  end;
end $$;
-- Query skalar harus bernilai tertentu
create function t.expect_val(nm text, q text, expected text) returns void language plpgsql as $$
declare v text;
begin
  begin
    execute q into v;
    perform t.check(nm, v is not distinct from expected, 'nilai=' || coalesce(v, 'NULL') || ', harapan=' || expected);
  exception when others then
    perform t.check(nm, false, sqlstate || ' ' || sqlerrm);
  end;
end $$;

\o /dev/null
-- ---------- SETUP (sebagai postgres) ----------
with ins as (
  insert into auth.users (email) values
    ('admin@test.local'), ('m1@test.local'), ('m2@test.local'),
    ('anonuser@test.local'), ('spam@test.local')
  returning id, email
)
insert into t.u select split_part(email, '@', 1), id from ins;
update auth.users set is_anonymous = true where email = 'anonuser@test.local';
insert into public.ef_admins (user_id) select id from t.u where name = 'admin';
insert into t.u select 'p:' || slug, id from public.ef_profiles;

select t.login((select id from t.u where name='m1'));    select public.ef_ensure_profile('Member One');  select t.back();
select t.login((select id from t.u where name='m2'));    select public.ef_ensure_profile('Member Two');  select t.back();
select t.login((select id from t.u where name='spam')); select public.ef_ensure_profile('Spammer');     select t.back();
select t.login((select id from t.u where name='admin')); select public.ef_ensure_profile('Admin One');   select t.back();

-- ---------- A. DATA AWAL TERJAGA ----------
select t.expect_val('seed: 8 profil asli', $q$select count(*) from public.ef_profiles$q$, '8');
select t.expect_val('seed: 14 frame (8 asli + 6 Y2K)', $q$select count(*) from public.ef_frames$q$, '14');
select t.expect_val('seed: nama/username/mood tidak berubah',
  $q$select count(*) from public.ef_profiles where (slug,display_name,handle,mood_quote) in (
     ('anisa-fatimah','Anisa Fatimah','@nolvless_00','Living on cloud nine; serene'),
     ('arjunna','Arjunna','@2007.arj','Dreams over doubts'),
     ('leni-vale','Leni Vale','@leni.mp3','Main character energy'),
     ('faye-bloom','Faye Bloom','@faye.bloom','Sweet but offline'),
     ('ivo-day','Ivo Day','@ivo.day','A little magic in the margins'),
     ('jess-melo','Jess Melo','@jess.zip','Too bright to hide'),
     ('santi-noor','Santi Noor','@santi.sys','Future nostalgia'),
     ('kira-nova','Kira Nova','@kira.exe','Glitter in the cache'))$q$, '8');
select t.expect_val('seed: tidak ada foto palsu', $q$select count(*) from public.ef_profiles where photo_url is not null$q$, '0');
select t.expect_val('settings: 1 baris', $q$select count(*) from public.ef_settings$q$, '1');
select t.expect_val('RLS aktif di semua tabel ef_',
  $q$select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relname like 'ef\_%' and c.relkind='r' and not c.relrowsecurity$q$, '0');
select t.expect_val('privasi: tidak ada kolom email di ef_user_profiles',
  $q$select count(*) from information_schema.columns where table_name='ef_user_profiles' and column_name ilike '%mail%'$q$, '0');
select t.expect_val('privasi: nama profil bukan email',
  $q$select count(*) from public.ef_user_profiles where display_name like '%@%'$q$, '0');
select t.expect_val('bucket: batas 5 MB',
  $q$select file_size_limit from storage.buckets where id='ef-photos'$q$, '5242880');

-- ---------- B. EKSPOSUR FUNGSI ----------
select t.expect_val('fungsi: anon tak bisa jalankan ef_log', $q$select has_function_privilege('anon','public.ef_log(text,jsonb)','execute')$q$, 'false');
select t.expect_val('fungsi: authenticated tak bisa jalankan ef_log', $q$select has_function_privilege('authenticated','public.ef_log(text,jsonb)','execute')$q$, 'false');
select t.expect_val('fungsi: anon tak bisa ef_moderate_comment', $q$select has_function_privilege('anon','public.ef_moderate_comment(uuid,text)','execute')$q$, 'false');
select t.expect_val('fungsi: anon tak bisa ef_ensure_profile', $q$select has_function_privilege('anon','public.ef_ensure_profile(text)','execute')$q$, 'false');
select t.expect_val('fungsi: anon tak bisa trigger fn audit', $q$select has_function_privilege('anon','public.ef_audit_trg()','execute')$q$, 'false');
select t.expect_val('fungsi: authenticated tak bisa trigger fn komentar', $q$select has_function_privilege('authenticated','public.ef_comment_before_insert()','execute')$q$, 'false');

-- ---------- C. PENGUNJUNG (anon) ----------
select t.visitor();
select t.expect_val('anon: lihat 8 profil published', $q$select count(*) from public.ef_profiles$q$, '8');
select t.expect_val('anon: ef_gallery 8 baris', $q$select count(*) from public.ef_gallery()$q$, '8');
select t.expect_val('anon: lihat 14 frame', $q$select count(*) from public.ef_frames$q$, '14');
select t.expect_val('anon: bisa baca settings', $q$select count(*) from public.ef_settings$q$, '1');
select t.expect_err('anon: tidak bisa baca ef_votes', $q$select * from public.ef_votes$q$, array['42501']);
select t.expect_err('anon: tidak bisa vote', $q$insert into public.ef_votes(profile_id,user_id) values ((select id from t.u where name='p:arjunna'), (select id from t.u where name='m1'))$q$, array['42501']);
select t.expect_err('anon: tidak bisa komentar', $q$insert into public.ef_comments(profile_id,user_id,body) values ((select id from t.u where name='p:arjunna'), (select id from t.u where name='m1'),'hi')$q$, array['42501']);
select t.expect_err('anon: tidak bisa baca audit', $q$select * from public.ef_audit$q$, array['42501']);
select t.expect_err('anon: tidak bisa baca ef_admins', $q$select * from public.ef_admins$q$, array['42501']);
select t.expect_err('anon: tidak bisa ubah frame', $q$update public.ef_frames set bg='#000000'$q$, array['42501']);
select t.expect_err('anon: tidak bisa ubah settings', $q$update public.ef_settings set voting_enabled=false$q$, array['42501']);
select t.expect_err('anon: tidak bisa moderasi', $q$select public.ef_moderate_comment(gen_random_uuid(),'hidden')$q$, array['42501']);
select t.expect_err('anon: tidak bisa buat profil user', $q$select public.ef_ensure_profile('X')$q$, array['42501']);
select t.expect_err('anon: tidak bisa upload foto', $q$insert into storage.objects(bucket_id,name) values ('ef-photos','a.png')$q$, array['42501']);
select t.back();

-- ---------- D. AKUN ANONYMOUS (bukan anggota) ----------
select t.login((select id from t.u where name='anonuser'), true);
select t.expect_err('anonymous-signin: tidak bisa vote', $q$insert into public.ef_votes(profile_id) values ((select id from t.u where name='p:arjunna'))$q$, array['42501']);
select t.expect_err('anonymous-signin: tidak bisa komentar', $q$insert into public.ef_comments(profile_id,body) values ((select id from t.u where name='p:arjunna'),'hi')$q$, array['42501','23503']);
select t.expect_err('anonymous-signin: tidak bisa buat profil', $q$select public.ef_ensure_profile('X')$q$, array['42501']);
select t.back();

-- ---------- E. VOTING ----------
select t.login((select id from t.u where name='m1'));
select t.expect_rows('vote: M1 vote Anisa', $q$insert into public.ef_votes(profile_id) values ((select id from t.u where name='p:anisa-fatimah'))$q$, 1);
select t.expect_err('vote: duplikat ditolak constraint', $q$insert into public.ef_votes(profile_id) values ((select id from t.u where name='p:anisa-fatimah'))$q$, array['23505']);
select t.expect_err('vote: tidak bisa vote atas nama M2', $q$insert into public.ef_votes(profile_id,user_id) values ((select id from t.u where name='p:arjunna'), (select id from t.u where name='m2'))$q$, array['42501']);
select t.expect_err('vote: tidak bisa ubah vote (update dicabut)', $q$update public.ef_votes set profile_id=(select id from t.u where name='p:arjunna')$q$, array['42501']);
select t.expect_val('vote: ef_gallery voted=true untuk M1', $q$select voted from public.ef_gallery() where slug='anisa-fatimah'$q$, 'true');
select t.back();
select t.login((select id from t.u where name='m2'));
select t.expect_rows('vote: M2 vote Anisa', $q$insert into public.ef_votes(profile_id) values ((select id from t.u where name='p:anisa-fatimah'))$q$, 1);
select t.expect_val('vote: M2 hanya melihat vote sendiri', $q$select count(*) from public.ef_votes$q$, '1');
select t.expect_val('vote: total publik = 2', $q$select vote_count from public.ef_gallery() where slug='anisa-fatimah'$q$, '2');
select t.back();
select t.visitor();
select t.expect_val('vote: anon melihat total 2, voted=false', $q$select vote_count||'/'||voted from public.ef_gallery() where slug='anisa-fatimah'$q$, '2/false');
select t.back();
select t.login((select id from t.u where name='m1'));
select t.expect_rows('vote: M1 hanya menghapus vote miliknya', $q$delete from public.ef_votes where profile_id=(select id from t.u where name='p:anisa-fatimah')$q$, 1);
select t.expect_val('vote: tersisa 1 (milik M2)', $q$select vote_count from public.ef_gallery() where slug='anisa-fatimah'$q$, '1');
select t.back();

-- ---------- F. OTORISASI ADMIN ----------
select t.login((select id from t.u where name='m1'));
select t.expect_rows('admin-only: member tidak bisa ubah settings', $q$update public.ef_settings set voting_enabled=false$q$, 0);
select t.expect_rows('admin-only: member tidak bisa ubah frame', $q$update public.ef_frames set bg='#000000'$q$, 0);
select t.expect_err('admin-only: member tidak bisa buat frame', $q$insert into public.ef_frames(id,name) values ('hack','Hack')$q$, array['42501']);
select t.expect_err('admin-only: member tidak bisa buat profil', $q$insert into public.ef_profiles(slug,display_name,frame_id) values ('hack','Hack','bubble-pop')$q$, array['42501']);
select t.expect_rows('admin-only: member tidak bisa ubah profil', $q$update public.ef_profiles set display_name='Hacked'$q$, 0);
select t.expect_rows('admin-only: member tidak bisa hapus profil', $q$delete from public.ef_profiles$q$, 0);
select t.expect_err('admin-only: member tidak bisa promosi diri jadi admin', $q$insert into public.ef_admins(user_id) values ((select id from t.u where name='m1'))$q$, array['42501']);
select t.expect_val('admin-only: ef_is_admin() false utk member', $q$select public.ef_is_admin()$q$, 'false');
select t.expect_rows('admin-only: member tidak bisa baca audit', $q$select * from public.ef_audit$q$, 0);
select t.expect_err('admin-only: member tidak bisa tulis audit', $q$insert into public.ef_audit(action) values ('fake')$q$, array['42501']);
select t.expect_err('admin-only: member tidak bisa ef_log', $q$select public.ef_log('x','{}')$q$, array['42501']);
select t.expect_err('admin-only: member tidak bisa moderasi', $q$select public.ef_moderate_comment(gen_random_uuid(),'hidden')$q$, array['42501']);
select t.expect_rows('admin-only: member tidak bisa ubah nama user lain', $q$update public.ef_user_profiles set display_name='X' where user_id=(select id from t.u where name='m2')$q$, 0);
select t.expect_err('admin-only: member tidak bisa insert user profile langsung', $q$insert into public.ef_user_profiles(user_id,display_name) values (gen_random_uuid(),'X')$q$, array['42501']);
select t.expect_err('storage: member tidak bisa upload foto', $q$insert into storage.objects(bucket_id,name) values ('ef-photos','a.png')$q$, array['42501']);
select t.back();
select t.expect_val('admin-only: profil tetap utuh setelah percobaan member', $q$select count(*) from public.ef_profiles where display_name <> 'Hacked'$q$, '8');

select t.login((select id from t.u where name='admin'));
select t.expect_val('admin: ef_is_admin() true', $q$select public.ef_is_admin()$q$, 'true');
select t.expect_rows('admin: ubah warna frame Bubble Pop', $q$update public.ef_frames set bg='#84AEF8', border='#17151C' where id='bubble-pop'$q$, 1);
select t.expect_val('admin: nama & id frame tak berubah', $q$select name from public.ef_frames where id='bubble-pop'$q$, 'Bubble Pop');
select t.expect_val('admin: audit mencatat frame + admin', $q$select count(*) from public.ef_audit where action='frames.update' and admin_id=(select id from t.u where name='admin')$q$, '1');
select t.expect_err('validasi: warna bukan hex ditolak', $q$update public.ef_frames set bg='red; background:url(x)' where id='bubble-pop'$q$, array['23514']);
select t.expect_err('validasi: warna 3-digit ditolak', $q$update public.ef_frames set bg='#fff' where id='bubble-pop'$q$, array['23514']);
select t.expect_err('validasi: radius di luar batas', $q$update public.ef_frames set radius=99 where id='bubble-pop'$q$, array['23514']);
select t.expect_rows('admin: ubah layout/decor/halftone frame', $q$update public.ef_frames set layout='booth', decor='bows', big_shape='heart', halftone=true, deco1='#FA78CF', deco2='#FFFFFF', pattern='gingham' where id='photobooth'$q$, 1);
select t.expect_err('validasi: layout liar ditolak', $q$update public.ef_frames set layout='<script>' where id='photobooth'$q$, array['23514']);
select t.expect_err('validasi: decor liar ditolak', $q$update public.ef_frames set decor='x' where id='photobooth'$q$, array['23514']);
select t.expect_err('validasi: big_shape liar ditolak', $q$update public.ef_frames set big_shape='x' where id='photobooth'$q$, array['23514']);
select t.expect_err('validasi: deco1 bukan hex ditolak', $q$update public.ef_frames set deco1='red' where id='photobooth'$q$, array['23514']);
select t.expect_err('validasi: deco2 bukan hex ditolak', $q$update public.ef_frames set deco2='url(x)' where id='photobooth'$q$, array['23514']);
select t.expect_err('validasi: pola liar ditolak', $q$update public.ef_frames set pattern='zigzag' where id='photobooth'$q$, array['23514']);
select t.expect_err('validasi: pattern tak dikenal', $q$update public.ef_frames set pattern='x' where id='bubble-pop'$q$, array['23514']);
select t.expect_err('validasi: photo_url javascript: ditolak', $q$update public.ef_profiles set photo_url='javascript:alert(1)' where slug='arjunna'$q$, array['23514']);
select t.expect_rows('admin: set photo_url https', $q$update public.ef_profiles set photo_url='https://example.com/a.jpg' where slug='arjunna'$q$, 1);
select t.expect_rows('admin: kembalikan photo_url null', $q$update public.ef_profiles set photo_url=null where slug='arjunna'$q$, 1);
select t.expect_err('integritas: frame yang dipakai tak bisa dihapus', $q$delete from public.ef_frames where id='bubble-pop'$q$, array['23503']);
select t.expect_rows('admin: duplikat frame', $q$insert into public.ef_frames(id,name,bg) select 'bubble-pop-copy','Bubble Pop Copy',bg from public.ef_frames where id='bubble-pop'$q$, 1);
select t.expect_rows('admin: ubah sort_order profil', $q$update public.ef_profiles set sort_order=sort_order where slug='arjunna'$q$, 1);
select t.expect_val('audit: update non-status profil tidak dicatat', $q$select count(*) from public.ef_audit where action='profiles.update'$q$, '0');
select t.expect_rows('admin: baca audit', $q$select * from public.ef_audit$q$, 3);
select t.expect_rows('storage: admin boleh upload foto', $q$insert into storage.objects(bucket_id,name) values ('ef-photos','a.png')$q$, 1);
select t.back();
select t.login((select id from t.u where name='m1'));
select t.expect_val('storage: member tak bisa melihat/list foto', $q$select count(*) from storage.objects$q$, '0');
select t.expect_rows('storage: member tak bisa hapus foto', $q$delete from storage.objects where bucket_id='ef-photos'$q$, 0);
select t.back();
select t.login((select id from t.u where name='admin'));
select t.expect_rows('storage: admin boleh hapus foto', $q$delete from storage.objects where bucket_id='ef-photos' and name='a.png'$q$, 1);
select t.back();
-- kembalikan frame demi tes selanjutnya
update public.ef_frames set bg='#FA78CF' where id='bubble-pop';
delete from public.ef_frames where id='bubble-pop-copy';

-- ---------- G. FEATURE FLAG ----------
select t.login((select id from t.u where name='admin'));
select t.expect_rows('flag: admin matikan voting', $q$update public.ef_settings set voting_enabled=false$q$, 1);
select t.back();
select t.login((select id from t.u where name='m1'));
select t.expect_err('flag: vote ditolak DB saat voting dimatikan', $q$insert into public.ef_votes(profile_id) values ((select id from t.u where name='p:arjunna'))$q$, array['42501']);
select t.back();
select t.login((select id from t.u where name='admin'));
select t.expect_rows('flag: admin nyalakan voting', $q$update public.ef_settings set voting_enabled=true$q$, 1);
select t.expect_val('flag: perubahan settings dicatat audit', $q$select count(*) from public.ef_audit where action='settings.update'$q$, '2');
select t.expect_rows('flag: admin matikan komentar', $q$update public.ef_settings set comments_enabled=false$q$, 1);
select t.back();
select t.login((select id from t.u where name='m1'));
select t.expect_err('flag: komentar ditolak DB saat dimatikan', $q$insert into public.ef_comments(profile_id,body) values ((select id from t.u where name='p:arjunna'),'halo')$q$, array['42501']);
select t.back();
select t.login((select id from t.u where name='admin'));
select t.expect_rows('flag: admin nyalakan komentar', $q$update public.ef_settings set comments_enabled=true$q$, 1);
select t.back();

-- ---------- H. KOMENTAR ----------
select t.login((select id from t.u where name='m1'));
select t.expect_rows('komentar: M1 kirim (payload XSS disimpan sebagai teks)', $q$insert into public.ef_comments(profile_id,body) values ((select id from t.u where name='p:arjunna'),'Halo <script>alert(1)</script>')$q$, 1);
select t.expect_val('komentar: isi tersimpan apa adanya (UI wajib textContent)', $q$select body from public.ef_comments limit 1$q$, 'Halo <script>alert(1)</script>');
select t.expect_val('komentar: status default visible', $q$select status from public.ef_comments limit 1$q$, 'visible');
select t.expect_err('komentar: tidak bisa atas nama M2', $q$insert into public.ef_comments(profile_id,user_id,body) values ((select id from t.u where name='p:arjunna'),(select id from t.u where name='m2'),'palsu')$q$, array['42501']);
select t.expect_err('komentar: kosong ditolak', $q$insert into public.ef_comments(profile_id,body) values ((select id from t.u where name='p:arjunna'),'')$q$, array['23514']);
select t.expect_err('komentar: spasi saja ditolak', $q$insert into public.ef_comments(profile_id,body) values ((select id from t.u where name='p:arjunna'),'    ')$q$, array['23514']);
select t.expect_err('komentar: 501 karakter ditolak', $q$insert into public.ef_comments(profile_id,body) values ((select id from t.u where name='p:arjunna'),repeat('a',501))$q$, array['23514']);
select t.expect_rows('komentar: M1 edit isi sendiri', $q$update public.ef_comments set body='Halo (diedit)'$q$, 1);
select t.expect_err('komentar: M1 tidak bisa ubah status sendiri', $q$update public.ef_comments set status='hidden'$q$, array['42501']);
select t.expect_err('komentar: M1 tidak bisa ubah penulis', $q$update public.ef_comments set user_id=(select id from t.u where name='m2')$q$, array['42501']);
select t.back();
select t.login((select id from t.u where name='m2'));
select t.expect_rows('komentar: M2 tidak bisa edit komentar M1', $q$update public.ef_comments set body='dibajak'$q$, 0);
select t.expect_rows('komentar: M2 tidak bisa hapus komentar M1', $q$delete from public.ef_comments$q$, 0);
select t.back();
select t.visitor();
select t.expect_val('komentar: anon bisa baca + nama penulis publik', $q$select count(*) from public.ef_comments c join public.ef_user_profiles p on p.user_id=c.user_id where p.display_name='Member One'$q$, '1');
select t.expect_val('komentar: ef_gallery comment_count=1', $q$select comment_count from public.ef_gallery() where slug='arjunna'$q$, '1');
select t.back();

-- hide / restore (M2 menulis komentar untuk dimoderasi)
select t.login((select id from t.u where name='m2'));
select t.expect_rows('moderasi: M2 komentar', $q$insert into public.ef_comments(profile_id,body) values ((select id from t.u where name='p:leni-vale'),'komentar M2')$q$, 1);
select t.back();
select t.login((select id from t.u where name='admin'));
select t.expect_rows('moderasi: admin sembunyikan', $q$select public.ef_moderate_comment((select id from public.ef_comments where body='komentar M2'),'hidden')$q$, 1);
select t.expect_err('moderasi: status tak valid ditolak', $q$select public.ef_moderate_comment((select id from public.ef_comments where body='komentar M2'),'pending')$q$, array['P0001']);
select t.expect_val('moderasi: admin tetap bisa baca komentar hidden', $q$select status from public.ef_comments where body='komentar M2'$q$, 'hidden');
select t.back();
select t.visitor();
select t.expect_val('moderasi: hidden tak terbaca publik', $q$select count(*) from public.ef_comments where body='komentar M2'$q$, '0');
select t.expect_val('moderasi: hidden tak dihitung', $q$select comment_count from public.ef_gallery() where slug='leni-vale'$q$, '0');
select t.back();
select t.login((select id from t.u where name='m2'));
select t.expect_val('moderasi: penulis juga tak bisa baca yang hidden', $q$select count(*) from public.ef_comments where body='komentar M2'$q$, '0');
select t.expect_rows('moderasi: penulis tak bisa edit yang hidden', $q$update public.ef_comments set body='bangkit'$q$, 0);
select t.back();
select t.login((select id from t.u where name='admin'));
select t.expect_rows('moderasi: admin pulihkan', $q$select public.ef_moderate_comment((select id from public.ef_comments where body='komentar M2'),'visible')$q$, 1);
select t.expect_val('moderasi: audit comment.hidden', $q$select count(*) from public.ef_audit where action='comment.hidden'$q$, '1');
select t.back();

-- moderasi dengan persetujuan
select t.login((select id from t.u where name='admin'));
select t.expect_rows('approval: admin aktifkan', $q$update public.ef_settings set comments_need_approval=true$q$, 1);
select t.expect_rows('approval: komentar admin langsung visible', $q$insert into public.ef_comments(profile_id,body) values ((select id from t.u where name='p:jess-melo'),'dari admin')$q$, 1);
select t.expect_val('approval: status komentar admin', $q$select status from public.ef_comments where body='dari admin'$q$, 'visible');
select t.back();
select t.login((select id from t.u where name='m1'));
select t.expect_rows('approval: komentar member', $q$insert into public.ef_comments(profile_id,body) values ((select id from t.u where name='p:jess-melo'),'butuh persetujuan')$q$, 1);
select t.expect_val('approval: status pending', $q$select status from public.ef_comments where body='butuh persetujuan'$q$, 'pending');
select t.back();
select t.visitor();
select t.expect_val('approval: pending tak terbaca publik', $q$select count(*) from public.ef_comments where body='butuh persetujuan'$q$, '0');
select t.back();
select t.login((select id from t.u where name='admin'));
select t.expect_rows('approval: admin setujui', $q$select public.ef_moderate_comment((select id from public.ef_comments where body='butuh persetujuan'),'visible')$q$, 1);
select t.expect_rows('approval: admin matikan', $q$update public.ef_settings set comments_need_approval=false$q$, 1);
select t.back();
select t.visitor();
select t.expect_val('approval: kini terbaca publik', $q$select count(*) from public.ef_comments where body='butuh persetujuan'$q$, '1');
select t.back();

-- anti-spam (user khusus)
select t.login((select id from t.u where name='spam'));
select t.expect_rows('spam: komentar 1', $q$insert into public.ef_comments(profile_id,body) values ((select id from t.u where name='p:faye-bloom'),'s1')$q$, 1);
select t.expect_rows('spam: komentar 2', $q$insert into public.ef_comments(profile_id,body) values ((select id from t.u where name='p:faye-bloom'),'s2')$q$, 1);
select t.expect_rows('spam: komentar 3', $q$insert into public.ef_comments(profile_id,body) values ((select id from t.u where name='p:faye-bloom'),'s3')$q$, 1);
select t.expect_rows('spam: komentar 4', $q$insert into public.ef_comments(profile_id,body) values ((select id from t.u where name='p:faye-bloom'),'s4')$q$, 1);
select t.expect_rows('spam: komentar 5', $q$insert into public.ef_comments(profile_id,body) values ((select id from t.u where name='p:faye-bloom'),'s5')$q$, 1);
select t.expect_err('spam: komentar ke-6 dalam semenit ditolak', $q$insert into public.ef_comments(profile_id,body) values ((select id from t.u where name='p:faye-bloom'),'s6')$q$, array['P0001']);
select t.back();

-- ---------- I. LAPORAN KOMENTAR ----------
select t.login((select id from t.u where name='m2'));
select t.expect_rows('laporan: M2 laporkan komentar M1', $q$insert into public.ef_comment_reports(comment_id,reason) values ((select id from public.ef_comments where body='Halo (diedit)'),'spam')$q$, 1);
select t.expect_err('laporan: duplikat ditolak', $q$insert into public.ef_comment_reports(comment_id) values ((select id from public.ef_comments where body='Halo (diedit)'))$q$, array['23505']);
select t.back();
select t.login((select id from t.u where name='m1'));
select t.expect_rows('laporan: M1 tak bisa baca laporan orang lain', $q$select * from public.ef_comment_reports$q$, 0);
select t.expect_rows('laporan: M1 tak bisa hapus laporan', $q$delete from public.ef_comment_reports$q$, 0);
select t.back();
select t.visitor();
select t.expect_err('laporan: anon tak bisa melapor', $q$insert into public.ef_comment_reports(comment_id,user_id) values ((select id from public.ef_comments where body='Halo (diedit)'),(select id from t.u where name='m2'))$q$, array['42501']);
select t.back();
select t.login((select id from t.u where name='admin'));
select t.expect_rows('laporan: admin melihat laporan', $q$select * from public.ef_comment_reports$q$, 1);
select t.expect_rows('laporan: admin menutup laporan', $q$delete from public.ef_comment_reports$q$, 1);
select t.expect_rows('komentar: admin hapus komentar mana pun', $q$delete from public.ef_comments where body='dari admin'$q$, 1);
select t.back();
select t.login((select id from t.u where name='m1'));
select t.expect_rows('komentar: M1 hapus komentar sendiri', $q$delete from public.ef_comments where body='Halo (diedit)'$q$, 1);
select t.back();

-- ---------- J. PUBLIKASI ----------
select t.login((select id from t.u where name='admin'));
select t.expect_rows('publikasi: admin jadikan Kira draft', $q$update public.ef_profiles set status='draft' where slug='kira-nova'$q$, 1);
select t.expect_val('publikasi: audit status profil', $q$select count(*) from public.ef_audit where action='profiles.update'$q$, '1');
select t.expect_val('publikasi: admin tetap melihat 8 di ef_gallery', $q$select count(*) from public.ef_gallery()$q$, '8');
select t.back();
select t.visitor();
select t.expect_val('publikasi: anon hanya 7', $q$select count(*) from public.ef_gallery()$q$, '7');
select t.expect_val('publikasi: draft tak terbaca langsung', $q$select count(*) from public.ef_profiles where slug='kira-nova'$q$, '0');
select t.back();
select t.login((select id from t.u where name='m1'));
select t.expect_err('publikasi: tak bisa vote profil draft', $q$insert into public.ef_votes(profile_id) values ((select id from t.u where name='p:kira-nova'))$q$, array['42501']);
select t.expect_err('publikasi: tak bisa komentar profil draft', $q$insert into public.ef_comments(profile_id,body) values ((select id from t.u where name='p:kira-nova'),'x')$q$, array['42501']);
select t.back();
select t.login((select id from t.u where name='admin'));
select t.expect_rows('publikasi: arsipkan Kira', $q$update public.ef_profiles set status='archived' where slug='kira-nova'$q$, 1);
select t.back();
select t.visitor();
select t.expect_val('publikasi: arsip tak tampil publik', $q$select count(*) from public.ef_gallery()$q$, '7');
select t.back();
select t.login((select id from t.u where name='admin'));
select t.expect_rows('publikasi: pulihkan Kira', $q$update public.ef_profiles set status='published' where slug='kira-nova'$q$, 1);
select t.back();
select t.visitor();
select t.expect_val('publikasi: kembali 8', $q$select count(*) from public.ef_gallery()$q$, '8');
select t.back();

-- ---------- K. RETENSI (hapus profil -> vote & komentar ikut terhapus) ----------
insert into public.ef_profiles(slug,display_name,frame_id,status) values ('temp-card','Temp','bubble-pop','published');
insert into t.u select 'p:temp-card', id from public.ef_profiles where slug='temp-card';
select t.login((select id from t.u where name='m2'));
select t.expect_rows('retensi: M2 vote kartu temp', $q$insert into public.ef_votes(profile_id) values ((select id from t.u where name='p:temp-card'))$q$, 1);
select t.back();
select t.login((select id from t.u where name='admin'));
select t.expect_rows('retensi: admin hapus profil temp', $q$delete from public.ef_profiles where slug='temp-card'$q$, 1);
select t.back();
select t.expect_val('retensi: vote ikut terhapus (cascade)', $q$select count(*) from public.ef_votes where profile_id=(select id from t.u where name='p:temp-card')$q$, '0');

-- ---------- L. RE-RUN MIGRASI ----------
\o
select name, case when ok then 'PASS' else 'FAIL' end as hasil, detail from t.results where not ok order by n;
select count(*) filter (where ok) as pass, count(*) filter (where not ok) as fail, count(*) as total from t.results;
