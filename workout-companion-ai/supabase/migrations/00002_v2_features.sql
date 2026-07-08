-- ============================================================
-- Workout Companion AI — Migrazione 00002
-- Nuove funzioni: valutazione corporea (plicometria),
-- listino coaching, progressioni nutrizionali, TDEE avanzato.
--
-- COME SI USA: Supabase → SQL Editor → New query →
-- incolla tutto questo file → Run (UNA volta sola).
-- ============================================================

-- ------------------------------------------------------------
-- 1. VALUTAZIONE CORPOREA (pliche + circonferenze + stime)
-- ------------------------------------------------------------
create table body_assessments (
  id uuid primary key default uuid_generate_v4(),
  coach_client_id uuid not null references coach_clients(id) on delete cascade,
  measured_at date not null default current_date,
  operator text,                 -- chi ha misurato (coach, autovalutazione…)
  weight_kg numeric(5,1),
  -- Pliche in mm: {"tricipitale":{"dx":10,"sx":11}, "sottoscapolare":{...}, ...}
  skinfolds_mm jsonb not null default '{}',
  -- Circonferenze in cm: {"collo":38,"petto":102,"vita":81,...}
  circumferences_cm jsonb not null default '{}',
  -- Condizioni: {"stato":"digiuno","idratazione":"normale","fase_ciclo":null,"note":"..."}
  conditions jsonb not null default '{}',
  sum_skinfolds_mm numeric(6,1),
  body_fat_pct numeric(4,1),
  fat_mass_kg numeric(5,1),
  lean_mass_kg numeric(5,1),
  notes text,
  created_at timestamptz not null default now()
);

create index idx_body_assessments_client
  on body_assessments(coach_client_id, measured_at desc);

alter table body_assessments enable row level security;

create policy "assessments participants" on body_assessments for select
  using (is_in_coach_client(coach_client_id));
create policy "assessments insert" on body_assessments for insert
  with check (is_in_coach_client(coach_client_id));
create policy "assessments update" on body_assessments for update
  using (is_in_coach_client(coach_client_id));
create policy "assessments delete" on body_assessments for delete
  using (is_in_coach_client(coach_client_id));

-- ------------------------------------------------------------
-- 2. LISTINO COACHING (i pacchetti che il coach vende)
-- ------------------------------------------------------------
create table coach_offers (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid not null references profiles(id) on delete cascade,
  name text not null,                        -- Mensile, 3 Mesi…
  description text,
  duration_months int not null default 1,
  check_frequency text not null default 'settimanale'
    check (check_frequency in ('settimanale', 'bisettimanale', 'mensile')),
  price_cents int not null,                  -- 7900 = 79,00 €
  currency text not null default 'eur',
  is_published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_coach_offers_coach on coach_offers(coach_id, sort_order);

alter table coach_offers enable row level security;

create policy "offers coach manage" on coach_offers for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
-- I clienti del coach vedono solo i pacchetti pubblicati
create policy "offers clients read published" on coach_offers for select
  using (
    is_published
    and exists (
      select 1 from coach_clients cc
      where cc.coach_id = coach_offers.coach_id
        and cc.client_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 3. PROGRESSIONI NUTRIZIONALI (bulk / cut / mantenimento)
-- ------------------------------------------------------------
create table nutrition_progressions (
  id uuid primary key default uuid_generate_v4(),
  nutrition_plan_id uuid not null references nutrition_plans(id) on delete cascade,
  mode text not null check (mode in ('bulk', 'cut', 'maintenance')),
  increment_type text not null default 'percent'
    check (increment_type in ('percent', 'grams')),
  protein_increment numeric(6,2) not null default 0,  -- % o grammi per applicazione
  carbs_increment numeric(6,2) not null default 0,
  fat_increment numeric(6,2) not null default 0,
  cadence_weeks int not null default 2,     -- applica ogni N settimane
  duration_weeks int not null default 12,
  apply_condition text not null default 'fixed'
    check (apply_condition in ('fixed', 'stall')),
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_nutrition_progressions_plan
  on nutrition_progressions(nutrition_plan_id);

alter table nutrition_progressions enable row level security;

create policy "nprog via plan" on nutrition_progressions for all
  using (exists (
    select 1 from nutrition_plans np
    where np.id = nutrition_plan_id
      and (np.created_by = auth.uid() or is_in_coach_client(np.coach_client_id))
  ))
  with check (exists (
    select 1 from nutrition_plans np
    where np.id = nutrition_plan_id and np.created_by = auth.uid()
  ));

-- ------------------------------------------------------------
-- 4. TDEE AVANZATO sul piano nutrizionale
-- ------------------------------------------------------------
alter table nutrition_plans
  add column tdee_formula text not null default 'mifflin'
    check (tdee_formula in ('mifflin', 'katch_mcardle')),
  add column pal numeric(3,2),               -- fattore attività (es. 1.52)
  add column target_kcal int;                -- TEE scelto dal coach per il piano
