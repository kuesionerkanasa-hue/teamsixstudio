-- Mode tamu: pengunjung boleh vote & komentar cukup dengan memasukkan nama (tanpa email/password).
-- Memakai "Anonymous sign-ins" Supabase: setiap browser mendapat identitas tamu sendiri, jadi
-- aturan "satu identitas = satu vote per postcard" tetap ditegakkan database. Admin bisa mematikannya
-- kapan saja lewat Settings (guest_participation). Non-destruktif & idempoten. Jalankan setelah 05.
alter table public.ef_settings add column if not exists guest_participation boolean not null default true;

create or replace function public.ef_is_member()
returns boolean
language sql stable set search_path = ''
as $$
  select (select auth.uid()) is not null
     and (
       coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
       or coalesce((select s.guest_participation from public.ef_settings s where s.id = 1), false)
     )
$$;
grant execute on function public.ef_is_member() to anon, authenticated;

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
  -- nama yang menyerupai peran resmi dicadangkan agar tidak ada peniruan
  if nm <> '' and lower(regexp_replace(nm, '\s+', ' ', 'g')) in
       ('admin','administrator','moderator','admin tim 6','tim 6','kelompok 6','ethics frame studio')
     and not public.ef_is_admin() then
    raise exception 'That name is reserved. Please choose another.' using errcode = '22023';
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
