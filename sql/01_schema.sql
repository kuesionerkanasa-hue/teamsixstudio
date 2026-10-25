-- =====================================================================
-- ETHICS FRAME STUDIO — Migration 01 (non-destructive)
-- Semua objek memakai prefix ef_ supaya tidak menyentuh tabel lain di project.
-- Jalankan di: Supabase Dashboard > SQL Editor. Aman dijalankan ulang.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ROLE ADMIN
-- Tidak ada policy tulis untuk klien: admin hanya bisa ditambah lewat
-- SQL Editor (lihat 02_admin_setup.sql). Role TIDAK disimpan di metadata user.
-- ---------------------------------------------------------------------
create table if not exists public.ef_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.ef_admins enable row level security;

create or replace function public.ef_is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.ef_admins a where a.user_id = (select auth.uid()))
$$;
revoke all on function public.ef_is_admin() from public;
grant execute on function public.ef_is_admin() to anon, authenticated;

drop policy if exists ef_admins_select_self on public.ef_admins;
create policy ef_admins_select_self on public.ef_admins
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 2. PROFIL PENGGUNA (nama tampilan publik; email tidak pernah dibuka)
-- ---------------------------------------------------------------------
create table if not exists public.ef_user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now()
);
alter table public.ef_user_profiles enable row level security;

drop policy if exists ef_up_select on public.ef_user_profiles;
create policy ef_up_select on public.ef_user_profiles
  for select to anon, authenticated using (true);
drop policy if exists ef_up_update_own on public.ef_user_profiles;
create policy ef_up_update_own on public.ef_user_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Akun anonymous (mis. dari aplikasi lain di project yang sama) bukan anggota.
create or replace function public.ef_is_member()
returns boolean
language sql stable set search_path = ''
as $$
  select (select auth.uid()) is not null
     and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
$$;
grant execute on function public.ef_is_member() to anon, authenticated;

-- Profil dibuat oleh klien lewat RPC setelah login. TIDAK ada trigger di auth.users
-- dan tidak ada backfill, jadi akun/aplikasi lain di project ini tidak tersentuh.
-- Email tidak pernah dipakai sebagai nama tampilan.
create or replace function public.ef_ensure_profile(p_name text default null)
returns public.ef_user_profiles
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  nm text := left(btrim(coalesce(p_name, '')), 40);
  r public.ef_user_profiles;
begin
  if uid is null or not public.ef_is_member() then
    raise exception 'not a member' using errcode = '42501';
  end if;
  insert into public.ef_user_profiles (user_id, display_name)
  values (uid, case when nm = '' then 'Member' else nm end)
  on conflict (user_id) do update
    set display_name = case when nm <> '' then excluded.display_name
                            else public.ef_user_profiles.display_name end
  returning * into r;
  return r;
end $$;
revoke all on function public.ef_ensure_profile(text) from public, anon;
grant execute on function public.ef_ensure_profile(text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. PENGATURAN KOMUNITAS (satu baris)
-- ---------------------------------------------------------------------
create table if not exists public.ef_settings (
  id int primary key default 1 check (id = 1),
  voting_enabled boolean not null default true,
  comments_enabled boolean not null default true,
  spotlight_enabled boolean not null default true,
  default_sort text not null default 'all' check (default_sort in ('all','votes','comments','recent')),
  publish_immediately boolean not null default false,
  comments_need_approval boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.ef_settings (id) values (1) on conflict (id) do nothing;
alter table public.ef_settings enable row level security;

drop policy if exists ef_settings_select on public.ef_settings;
create policy ef_settings_select on public.ef_settings
  for select to anon, authenticated using (true);
drop policy if exists ef_settings_update_admin on public.ef_settings;
create policy ef_settings_update_admin on public.ef_settings
  for update to authenticated
  using ((select public.ef_is_admin()))
  with check ((select public.ef_is_admin()));

-- ---------------------------------------------------------------------
-- 4. FRAME PRESETS
-- Warna divalidasi di database (hanya #RRGGBB) -> tidak ada CSS injection.
-- ---------------------------------------------------------------------
create table if not exists public.ef_frames (
  id text primary key check (id ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  bg text not null default '#FA78CF' check (bg ~ '^#[0-9A-Fa-f]{6}$'),
  border text not null default '#17151C' check (border ~ '^#[0-9A-Fa-f]{6}$'),
  accent text not null default '#17151C' check (accent ~ '^#[0-9A-Fa-f]{6}$'),
  text_color text not null default '#17151C' check (text_color ~ '^#[0-9A-Fa-f]{6}$'),
  star text not null default '#FFE36C' check (star ~ '^#[0-9A-Fa-f]{6}$'),
  shadow text not null default '#17151C' check (shadow ~ '^#[0-9A-Fa-f]{6}$'),
  radius int not null default 0 check (radius between 0 and 32),
  pattern text not null default 'none' check (pattern in ('none','grid','dots','stripes')),
  sort_order int not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.ef_frames enable row level security;

drop policy if exists ef_frames_select on public.ef_frames;
create policy ef_frames_select on public.ef_frames
  for select to anon, authenticated using (true);
drop policy if exists ef_frames_insert_admin on public.ef_frames;
create policy ef_frames_insert_admin on public.ef_frames
  for insert to authenticated with check ((select public.ef_is_admin()));
drop policy if exists ef_frames_update_admin on public.ef_frames;
create policy ef_frames_update_admin on public.ef_frames
  for update to authenticated
  using ((select public.ef_is_admin()))
  with check ((select public.ef_is_admin()));
drop policy if exists ef_frames_delete_admin on public.ef_frames;
create policy ef_frames_delete_admin on public.ef_frames
  for delete to authenticated using ((select public.ef_is_admin()));

-- Preset asli dari desain Canva (warna = palet resmi)
insert into public.ef_frames (id, name, bg, star, sort_order) values
  ('bubble-pop',   'Bubble Pop',   '#FA78CF', '#FFE36C', 1),
  ('cyber-grid',   'Cyber Grid',   '#C9FF38', '#FFE36C', 2),
  ('chrome-kiss',  'Chrome Kiss',  '#84AEF8', '#FFE36C', 3),
  ('sugar-rush',   'Sugar Rush',   '#FFE36C', '#FFFFFF', 4),
  ('violet-web',   'Violet Web',   '#C8A1FF', '#FFE36C', 5),
  ('tangerine',    'Tangerine',    '#FF9858', '#FFE36C', 6),
  ('liquid-metal', 'Liquid Metal', '#C8CDD5', '#FFE36C', 7),
  ('cherry-byte',  'Cherry Byte',  '#FF5E6C', '#FFE36C', 8)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 5. POSTCARD / PROFIL
-- Foto tidak pernah diubah otomatis; hanya admin yang bisa mengganti photo_url.
-- ---------------------------------------------------------------------
create table if not exists public.ef_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  handle text check (handle is null or char_length(handle) <= 40),
  energy_label text check (energy_label is null or char_length(energy_label) <= 40),
  mood_quote text check (mood_quote is null or char_length(mood_quote) <= 140),
  photo_url text check (photo_url is null or photo_url ~ '^https://'),
  frame_id text not null references public.ef_frames(id) on update cascade on delete restrict,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ef_profiles_status_idx on public.ef_profiles (status, sort_order);
create index if not exists ef_profiles_frame_idx on public.ef_profiles (frame_id);
alter table public.ef_profiles enable row level security;

drop policy if exists ef_profiles_select on public.ef_profiles;
create policy ef_profiles_select on public.ef_profiles
  for select to anon, authenticated
  using (status = 'published' or (select public.ef_is_admin()));
drop policy if exists ef_profiles_insert_admin on public.ef_profiles;
create policy ef_profiles_insert_admin on public.ef_profiles
  for insert to authenticated with check ((select public.ef_is_admin()));
drop policy if exists ef_profiles_update_admin on public.ef_profiles;
create policy ef_profiles_update_admin on public.ef_profiles
  for update to authenticated
  using ((select public.ef_is_admin()))
  with check ((select public.ef_is_admin()));
drop policy if exists ef_profiles_delete_admin on public.ef_profiles;
create policy ef_profiles_delete_admin on public.ef_profiles
  for delete to authenticated using ((select public.ef_is_admin()));

-- Data asli 8 anggota (nama, username, mood, frame). Foto diunggah admin
-- lewat panel Postcards -> photo_url dibiarkan kosong, tidak ada foto palsu.
insert into public.ef_profiles (slug, display_name, handle, energy_label, mood_quote, frame_id, status, sort_order) values
  ('anisa-fatimah', 'Anisa Fatimah', '@nolvless_00', 'Farfalla',    'Living on cloud nine; serene',  'bubble-pop',   'published', 1),
  ('arjunna',       'Arjunna',       '@2007.arj',    null,  'Dreams over doubts',            'cyber-grid',   'published', 2),
  ('leni-vale',     'Leni Vale',     '@leni.mp3',    null, 'Main character energy',         'chrome-kiss',  'published', 3),
  ('faye-bloom',    'Faye Bloom',    '@faye.bloom',  null,  'Sweet but offline',             'sugar-rush',   'published', 4),
  ('ivo-day',       'Ivo Day',       '@ivo.day',     null,  'A little magic in the margins', 'violet-web',   'published', 5),
  ('jess-melo',     'Jess Melo',     '@jess.zip',    null,   'Too bright to hide',            'tangerine',    'published', 6),
  ('santi-noor',    'Santi Noor',    '@santi.sys',   null,'Future nostalgia',              'liquid-metal', 'published', 7),
  ('kira-nova',     'Kira Nova',     '@kira.exe',    null, 'Glitter in the cache',          'cherry-byte',  'published', 8)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- 6. VOTES  (1 user = 1 vote per postcard, dipaksa oleh constraint)
-- ---------------------------------------------------------------------
create table if not exists public.ef_votes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.ef_profiles(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint ef_votes_one_per_user unique (profile_id, user_id)
);
create index if not exists ef_votes_profile_idx on public.ef_votes (profile_id);
alter table public.ef_votes enable row level security;

-- User hanya melihat vote miliknya; total publik diambil lewat ef_gallery().
drop policy if exists ef_votes_select on public.ef_votes;
create policy ef_votes_select on public.ef_votes
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.ef_is_admin()));
drop policy if exists ef_votes_insert on public.ef_votes;
create policy ef_votes_insert on public.ef_votes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.ef_is_member())
    and coalesce((select s.voting_enabled from public.ef_settings s where s.id = 1), false)
    and exists (select 1 from public.ef_profiles p where p.id = profile_id and p.status = 'published')
  );
drop policy if exists ef_votes_delete on public.ef_votes;
create policy ef_votes_delete on public.ef_votes
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 7. COMMENTS
-- ---------------------------------------------------------------------
create table if not exists public.ef_comments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.ef_profiles(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.ef_user_profiles(user_id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  status text not null default 'visible' check (status in ('visible','pending','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ef_comments_profile_idx on public.ef_comments (profile_id, created_at desc);
create index if not exists ef_comments_user_idx on public.ef_comments (user_id, created_at desc);
alter table public.ef_comments enable row level security;

-- Komentar hidden TIDAK bisa dibaca publik maupun penulisnya; hanya admin.
drop policy if exists ef_comments_select on public.ef_comments;
create policy ef_comments_select on public.ef_comments
  for select to anon, authenticated
  using (
    status = 'visible'
    or (user_id = (select auth.uid()) and status = 'pending')
    or (select public.ef_is_admin())
  );
drop policy if exists ef_comments_insert on public.ef_comments;
create policy ef_comments_insert on public.ef_comments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.ef_is_member())
    and coalesce((select s.comments_enabled from public.ef_settings s where s.id = 1), false)
    and exists (select 1 from public.ef_profiles p where p.id = profile_id and p.status = 'published')
  );
drop policy if exists ef_comments_update_own on public.ef_comments;
create policy ef_comments_update_own on public.ef_comments
  for update to authenticated
  using (user_id = (select auth.uid()) and status in ('visible','pending'))
  with check (user_id = (select auth.uid()));
drop policy if exists ef_comments_delete on public.ef_comments;
create policy ef_comments_delete on public.ef_comments
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.ef_is_admin()));

-- Penulis hanya boleh mengubah kolom body. Status moderasi lewat RPC admin.
revoke update on public.ef_comments from authenticated;
grant update (body) on public.ef_comments to authenticated;

create or replace function public.ef_comment_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare need boolean;
begin
  new.body := btrim(new.body);
  -- anti-spam: maksimal 5 komentar per menit per user
  if (select count(*) from public.ef_comments c
      where c.user_id = new.user_id and c.created_at > now() - interval '1 minute') >= 5 then
    raise exception 'Too many comments. Please wait a moment.';
  end if;
  select s.comments_need_approval into need from public.ef_settings s where s.id = 1;
  new.status := case when coalesce(need, false) and not public.ef_is_admin()
                     then 'pending' else 'visible' end;
  return new;
end $$;
revoke all on function public.ef_comment_before_insert() from public, anon, authenticated;
drop trigger if exists ef_comment_before_insert on public.ef_comments;
create trigger ef_comment_before_insert
  before insert on public.ef_comments
  for each row execute function public.ef_comment_before_insert();

-- ---------------------------------------------------------------------
-- 8. REPORT KOMENTAR
-- ---------------------------------------------------------------------
create table if not exists public.ef_comment_reports (
  comment_id uuid not null references public.ef_comments(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reason text check (reason is null or char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
alter table public.ef_comment_reports enable row level security;

drop policy if exists ef_reports_select on public.ef_comment_reports;
create policy ef_reports_select on public.ef_comment_reports
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.ef_is_admin()));
drop policy if exists ef_reports_insert on public.ef_comment_reports;
create policy ef_reports_insert on public.ef_comment_reports
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.ef_is_member())
    and exists (select 1 from public.ef_comments c where c.id = comment_id and c.status = 'visible')
  );
drop policy if exists ef_reports_delete_admin on public.ef_comment_reports;
create policy ef_reports_delete_admin on public.ef_comment_reports
  for delete to authenticated using ((select public.ef_is_admin()));

-- ---------------------------------------------------------------------
-- 9. AUDIT LOG (hanya bisa ditulis oleh fungsi/trigger server)
-- Tidak pernah mencatat password, token, atau secret.
-- ---------------------------------------------------------------------
create table if not exists public.ef_audit (
  id bigint generated always as identity primary key,
  admin_id uuid references public.ef_user_profiles(user_id) on delete set null,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.ef_audit enable row level security;
drop policy if exists ef_audit_select_admin on public.ef_audit;
create policy ef_audit_select_admin on public.ef_audit
  for select to authenticated using ((select public.ef_is_admin()));

create or replace function public.ef_log(p_action text, p_detail jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null or not public.ef_is_admin() then return; end if;
  insert into public.ef_user_profiles (user_id, display_name)
  values (uid, 'Admin')
  on conflict (user_id) do nothing;
  insert into public.ef_audit (admin_id, action, detail)
  values (uid, p_action, coalesce(p_detail, '{}'::jsonb));
end $$;
revoke all on function public.ef_log(text, jsonb) from public, anon, authenticated;

create or replace function public.ef_audit_trg()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare j jsonb;
begin
  j := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  if tg_table_name = 'ef_profiles' and tg_op = 'UPDATE'
     and (to_jsonb(old) ->> 'status') is not distinct from (to_jsonb(new) ->> 'status') then
    return new;
  end if;
  if tg_table_name = 'ef_settings' then
    perform public.ef_log('settings.update', j - 'updated_at' - 'id');
  else
    perform public.ef_log(
      substr(tg_table_name, 4) || '.' || lower(tg_op),
      jsonb_build_object('id', j ->> 'id',
                         'name', coalesce(j ->> 'name', j ->> 'display_name'),
                         'status', j ->> 'status'));
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
revoke all on function public.ef_audit_trg() from public, anon, authenticated;

drop trigger if exists ef_audit_frames on public.ef_frames;
create trigger ef_audit_frames after insert or update or delete on public.ef_frames
  for each row execute function public.ef_audit_trg();
drop trigger if exists ef_audit_profiles on public.ef_profiles;
create trigger ef_audit_profiles after insert or update or delete on public.ef_profiles
  for each row execute function public.ef_audit_trg();
drop trigger if exists ef_audit_settings on public.ef_settings;
create trigger ef_audit_settings after update on public.ef_settings
  for each row execute function public.ef_audit_trg();

-- ---------------------------------------------------------------------
-- 10. updated_at
-- ---------------------------------------------------------------------
create or replace function public.ef_touch()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;

create or replace function public.ef_frames_touch()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); new.updated_by := (select auth.uid()); return new; end $$;

drop trigger if exists ef_touch_profiles on public.ef_profiles;
create trigger ef_touch_profiles before update on public.ef_profiles
  for each row execute function public.ef_touch();
drop trigger if exists ef_touch_comments on public.ef_comments;
create trigger ef_touch_comments before update on public.ef_comments
  for each row execute function public.ef_touch();
drop trigger if exists ef_touch_settings on public.ef_settings;
create trigger ef_touch_settings before update on public.ef_settings
  for each row execute function public.ef_touch();
drop trigger if exists ef_touch_frames on public.ef_frames;
create trigger ef_touch_frames before update on public.ef_frames
  for each row execute function public.ef_frames_touch();

-- ---------------------------------------------------------------------
-- 11. RPC
-- ---------------------------------------------------------------------
-- Moderasi komentar: hanya admin (dicek di dalam fungsi).
create or replace function public.ef_moderate_comment(p_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.ef_is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_status not in ('visible','hidden') then
    raise exception 'invalid status';
  end if;
  update public.ef_comments set status = p_status where id = p_id;
  perform public.ef_log('comment.' || p_status, jsonb_build_object('id', p_id));
end $$;
revoke all on function public.ef_moderate_comment(uuid, text) from public, anon;
grant execute on function public.ef_moderate_comment(uuid, text) to authenticated;

-- Data galeri + hitungan nyata. Publik hanya melihat yang published;
-- admin melihat semuanya. Tidak membocorkan user_id pemilih.
create or replace function public.ef_gallery()
returns table (
  id uuid, slug text, display_name text, handle text, energy_label text,
  mood_quote text, photo_url text, frame_id text, status text, sort_order int,
  created_at timestamptz, vote_count bigint, comment_count bigint, voted boolean
)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.slug, p.display_name, p.handle, p.energy_label, p.mood_quote,
         p.photo_url, p.frame_id, p.status, p.sort_order, p.created_at,
         (select count(*) from public.ef_votes v where v.profile_id = p.id),
         (select count(*) from public.ef_comments c where c.profile_id = p.id and c.status = 'visible'),
         exists (select 1 from public.ef_votes v
                 where v.profile_id = p.id and v.user_id = (select auth.uid()))
  from public.ef_profiles p
  where p.status = 'published' or public.ef_is_admin()
  order by p.sort_order, p.created_at
$$;
revoke all on function public.ef_gallery() from public;
grant execute on function public.ef_gallery() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 12. STORAGE: foto postcard (bucket publik-baca, tulis hanya admin)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ef-photos', 'ef-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists ef_photos_admin_insert on storage.objects;
create policy ef_photos_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ef-photos' and (select public.ef_is_admin()));
drop policy if exists ef_photos_admin_update on storage.objects;
create policy ef_photos_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'ef-photos' and (select public.ef_is_admin()))
  with check (bucket_id = 'ef-photos' and (select public.ef_is_admin()));
drop policy if exists ef_photos_admin_delete on storage.objects;
create policy ef_photos_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'ef-photos' and (select public.ef_is_admin()));

-- DELETE/UPDATE dengan WHERE butuh SELECT policy; hanya admin yang boleh melihat/daftar objek.
-- (Bucket publik tetap bisa dibuka lewat URL; tidak bisa di-list oleh non-admin.)
drop policy if exists ef_photos_admin_select on storage.objects;
create policy ef_photos_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'ef-photos' and (select public.ef_is_admin()));

-- ---------------------------------------------------------------------
-- 13. GRANT (defense in depth di atas RLS)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['ef_admins','ef_user_profiles','ef_settings','ef_frames',
                           'ef_profiles','ef_votes','ef_comments','ef_comment_reports','ef_audit']
  loop
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from anon', t);
    execute format('revoke truncate, references, trigger on public.%I from authenticated', t);
  end loop;
end $$;
revoke all on public.ef_admins from anon;
revoke all on public.ef_audit from anon;
revoke all on public.ef_votes from anon;
revoke all on public.ef_comment_reports from anon;
revoke insert, update, delete on public.ef_admins from authenticated;
revoke insert, update, delete on public.ef_audit from authenticated;
revoke update on public.ef_votes from authenticated;
-- (ulang karena revoke update on ef_comments di atas sudah dijalankan sebelum loop)
revoke update on public.ef_comments from authenticated;
grant update (body) on public.ef_comments to authenticated;

-- ---------------------------------------------------------------------
-- 14. REALTIME (komentar saja)
-- ---------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.ef_comments;
exception when duplicate_object then null;
          when undefined_object then null;
end $$;
