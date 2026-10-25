#!/usr/bin/env bash
# Menjalankan skema + uji RLS di Postgres lokal (BUKAN di Supabase asli).
# Pakai:  PGHOST=/tmp PGPORT=55432 PGUSER=postgres ./tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=efs_test
export PGHOST="${PGHOST:-localhost}" PGPORT="${PGPORT:-5432}" PGUSER="${PGUSER:-postgres}"
psql -qX -d postgres -c "drop database if exists $DB" -c "create database $DB"
psql -qX -v ON_ERROR_STOP=1 -d $DB -f tests/00_supabase_stub.sql
echo "== jalankan 01_schema.sql (pertama)"
psql -qX -v ON_ERROR_STOP=1 -d $DB -f sql/01_schema.sql 2>&1 | grep -v '^NOTICE' || true
echo "== jalankan 01_schema.sql (kedua: harus idempoten)"
psql -qX -v ON_ERROR_STOP=1 -d $DB -f sql/01_schema.sql 2>&1 | grep -v '^NOTICE' || true
echo "== jalankan 03_y2k_frames.sql (dua kali: harus idempoten)"
psql -qX -v ON_ERROR_STOP=1 -d $DB -f sql/03_y2k_frames.sql 2>&1 | grep -v '^NOTICE' || true
psql -qX -v ON_ERROR_STOP=1 -d $DB -f sql/03_y2k_frames.sql 2>&1 | grep -v '^NOTICE' || true
echo "== jalankan 04_frame_custom_layout.sql (dua kali)"
psql -qX -v ON_ERROR_STOP=1 -d $DB -f sql/04_frame_custom_layout.sql 2>&1 | grep -v '^NOTICE' || true
psql -qX -v ON_ERROR_STOP=1 -d $DB -f sql/04_frame_custom_layout.sql 2>&1 | grep -v '^NOTICE' || true
psql -qX -d $DB -Atc "select 'profil='||count(*) from public.ef_profiles union all select 'frame='||count(*) from public.ef_frames union all select 'settings='||count(*) from public.ef_settings"
echo "== uji RLS"
psql -qX -d $DB -f tests/rls_tests.sql
