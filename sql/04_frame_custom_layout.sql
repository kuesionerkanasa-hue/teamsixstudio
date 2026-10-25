-- Posisi/ukuran/rotasi stiker yang digeser admin (Frame Studio). Non-destruktif & idempoten.
-- Jalankan SETELAH 03_y2k_frames.sql.
alter table public.ef_frames add column if not exists custom jsonb not null default '{}'::jsonb;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ef_frames_custom_chk' and conrelid = 'public.ef_frames'::regclass) then
    alter table public.ef_frames add constraint ef_frames_custom_chk
      check (jsonb_typeof(custom) = 'object' and pg_column_size(custom) <= 4000);
  end if;
end $$;
