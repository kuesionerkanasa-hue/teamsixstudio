-- Link profil (mis. Instagram) per postcard. Non-destruktif & idempoten. Jalankan setelah 04.
alter table public.ef_profiles add column if not exists profile_url text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ef_profiles_profile_url_chk' and conrelid = 'public.ef_profiles'::regclass) then
    alter table public.ef_profiles add constraint ef_profiles_profile_url_chk
      check (profile_url is null or (profile_url ~ '^https://[^[:space:]<>"]+$' and char_length(profile_url) <= 200));
  end if;
end $$;

-- ef_gallery sekarang ikut membawa profile_url (tipe kembalian berubah => drop lalu buat ulang)
drop function if exists public.ef_gallery();
create function public.ef_gallery()
returns table (
  id uuid, slug text, display_name text, handle text, energy_label text,
  mood_quote text, photo_url text, frame_id text, status text, sort_order int,
  created_at timestamptz, vote_count bigint, comment_count bigint, voted boolean,
  profile_url text
)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.slug, p.display_name, p.handle, p.energy_label, p.mood_quote,
         p.photo_url, p.frame_id, p.status, p.sort_order, p.created_at,
         (select count(*) from public.ef_votes v where v.profile_id = p.id),
         (select count(*) from public.ef_comments c where c.profile_id = p.id and c.status = 'visible'),
         exists (select 1 from public.ef_votes v
                 where v.profile_id = p.id and v.user_id = (select auth.uid())),
         p.profile_url
  from public.ef_profiles p
  where p.status = 'published' or public.ef_is_admin()
  order by p.sort_order, p.created_at
$$;
revoke all on function public.ef_gallery() from public;
grant execute on function public.ef_gallery() to anon, authenticated;
