-- ============================================================
-- Workout Companion AI — Migrazione 00003
-- Check Biofeedback GIORNALIERO + note rapide del coach.
--
-- COME SI USA: Supabase → SQL Editor → New query →
-- incolla tutto questo file → Run (UNA volta sola).
-- ============================================================

-- ------------------------------------------------------------
-- 1. BIOFEEDBACK GIORNALIERO
--    (il check-in settimanale resta per foto/misure; questo è
--     il diario quotidiano: sonno, stress, energia, nutrizione)
-- ------------------------------------------------------------
create table daily_biofeedback (
  id uuid primary key default uuid_generate_v4(),
  coach_client_id uuid not null references coach_clients(id) on delete cascade,
  log_date date not null default current_date,
  -- Stato generale (scale 1-10)
  sleep_quality int check (sleep_quality between 1 and 10),
  sleep_hours numeric(3,1),
  stress_level int check (stress_level between 1 and 10),
  energy_level int check (energy_level between 1 and 10),
  muscle_soreness int check (muscle_soreness between 1 and 10),
  joint_stress int check (joint_stress between 1 and 10),
  recovery int check (recovery between 1 and 10),
  -- Nutrizione assunta
  carbs_g int,
  protein_g int,
  fat_g int,
  kcal_consumed int,
  -- Altre metriche
  hydration_l numeric(3,1),
  steps int,
  weight_kg numeric(5,1),
  notes text,
  created_at timestamptz not null default now(),
  unique (coach_client_id, log_date)
);

create index idx_daily_biofeedback_client
  on daily_biofeedback(coach_client_id, log_date desc);

alter table daily_biofeedback enable row level security;

create policy "biofeedback participants read" on daily_biofeedback for select
  using (is_in_coach_client(coach_client_id));
create policy "biofeedback insert" on daily_biofeedback for insert
  with check (is_in_coach_client(coach_client_id));
create policy "biofeedback update" on daily_biofeedback for update
  using (is_in_coach_client(coach_client_id));
create policy "biofeedback delete" on daily_biofeedback for delete
  using (is_in_coach_client(coach_client_id));

-- ------------------------------------------------------------
-- 2. NOTE RAPIDE (il post-it del coach in dashboard)
-- ------------------------------------------------------------
create table quick_notes (
  coach_id uuid primary key references profiles(id) on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now()
);

alter table quick_notes enable row level security;

create policy "quick notes own" on quick_notes for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
