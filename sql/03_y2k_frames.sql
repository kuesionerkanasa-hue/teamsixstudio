-- Frame Y2K (collage / photobooth, stiker, halftone). Non-destruktif & idempoten: aman dijalankan ulang.
-- Jalankan SETELAH 01_schema.sql.
alter table public.ef_frames
  add column if not exists layout    text    not null default 'classic',
  add column if not exists decor     text    not null default 'none',
  add column if not exists big_shape text    not null default 'none',
  add column if not exists halftone  boolean not null default false,
  add column if not exists deco1     text    not null default '#FA78CF',
  add column if not exists deco2     text    not null default '#84AEF8';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ef_frames_layout_chk' and conrelid = 'public.ef_frames'::regclass) then
    alter table public.ef_frames add constraint ef_frames_layout_chk check (layout in ('classic','collage','booth'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ef_frames_decor_chk' and conrelid = 'public.ef_frames'::regclass) then
    alter table public.ef_frames add constraint ef_frames_decor_chk check (decor in ('none','stars','hearts','buttons','bows','mix'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ef_frames_big_shape_chk' and conrelid = 'public.ef_frames'::regclass) then
    alter table public.ef_frames add constraint ef_frames_big_shape_chk check (big_shape in ('none','star','heart','burst'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ef_frames_deco1_chk' and conrelid = 'public.ef_frames'::regclass) then
    alter table public.ef_frames add constraint ef_frames_deco1_chk check (deco1 ~ '^#[0-9A-Fa-f]{6}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ef_frames_deco2_chk' and conrelid = 'public.ef_frames'::regclass) then
    alter table public.ef_frames add constraint ef_frames_deco2_chk check (deco2 ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end $$;

-- pola latar: tambah gingham & checker
alter table public.ef_frames drop constraint if exists ef_frames_pattern_check;
alter table public.ef_frames add constraint ef_frames_pattern_check
  check (pattern in ('none','grid','dots','stripes','gingham','checker'));

-- 6 preset Y2K baru (tidak menimpa frame yang sudah ada / sudah Anda ubah)
insert into public.ef_frames
  (id, name, bg, border, accent, text_color, star, shadow, radius, pattern, layout, decor, big_shape, halftone, deco1, deco2, sort_order)
values
  ('star-collage',  'Star Collage',    '#84AEF8', '#17151C', '#17151C', '#17151C', '#FFE36C', '#17151C', 0, 'dots',    'collage', 'mix',     'star',  true,  '#FA78CF', '#FFFFFF', 9),
  ('photobooth',    'Photobooth Pink', '#FA78CF', '#17151C', '#17151C', '#17151C', '#FFE36C', '#17151C', 0, 'gingham', 'booth',   'buttons', 'none',  true,  '#84AEF8', '#FFFFFF', 10),
  ('lime-burst',    'Lime Burst',      '#C9FF38', '#17151C', '#17151C', '#17151C', '#FFE36C', '#17151C', 0, 'grid',    'collage', 'stars',   'burst', false, '#FFE36C', '#FA78CF', 11),
  ('cherry-heart',  'Cherry Heart',    '#FF5E6C', '#17151C', '#17151C', '#17151C', '#FFE36C', '#17151C', 0, 'dots',    'collage', 'hearts',  'heart', false, '#FFE36C', '#FFFFFF', 12),
  ('violet-bow',    'Violet Bow',      '#C8A1FF', '#17151C', '#17151C', '#17151C', '#FFE36C', '#17151C', 0, 'checker', 'booth',   'bows',    'none',  true,  '#FA78CF', '#FFE36C', 13),
  ('gingham-dream', 'Gingham Dream',   '#F3F0E8', '#17151C', '#17151C', '#17151C', '#FFE36C', '#17151C', 0, 'gingham', 'collage', 'mix',     'star',  false, '#84AEF8', '#FA78CF', 14)
on conflict (id) do nothing;
