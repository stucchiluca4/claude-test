-- ============================================================
-- Workout Companion AI — Schema iniziale
-- Migrazione 00001 — PostgreSQL / Supabase
-- ============================================================

-- Estensioni utili
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- ricerca testuale veloce (food database)

-- ============================================================
-- ENUM (liste di valori ammessi)
-- ============================================================
create type user_role as enum ('athlete', 'coach', 'gym_owner', 'admin');
create type client_status as enum ('invited', 'active', 'paused', 'ended');
create type org_role as enum ('owner', 'manager', 'coach');
create type program_goal as enum ('strength', 'hypertrophy', 'fat_loss', 'endurance', 'general_fitness', 'recomp');
create type program_status as enum ('draft', 'active', 'completed', 'archived');
create type set_type as enum ('normal', 'top_set', 'back_off', 'warmup', 'dropset', 'amrap');
create type day_type as enum ('training', 'rest');
create type checkin_status as enum ('pending', 'submitted', 'reviewed');
create type subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete');
create type message_status as enum ('sent', 'delivered', 'read');

-- ============================================================
-- AREA IDENTITÀ
-- ============================================================

-- Profilo utente: estende auth.users di Supabase
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'athlete',
  first_name text,
  last_name text,
  avatar_url text,
  date_of_birth date,
  sex text check (sex in ('male', 'female', 'other')),
  height_cm numeric(5,1),
  locale text not null default 'it',
  unit_system text not null default 'metric' check (unit_system in ('metric', 'imperial')),
  timezone text not null default 'Europe/Rome',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Palestre / studi (B2B)
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique,
  logo_url text,
  brand_primary_color text,   -- per white label futuro
  brand_secondary_color text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table organization_members (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role org_role not null default 'coach',
  created_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

-- Legame coach <-> cliente (cuore della sicurezza)
create table coach_clients (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid not null references profiles(id) on delete cascade,
  client_id uuid references profiles(id) on delete cascade, -- null finché l'invito non è accettato
  organization_id uuid references organizations(id) on delete set null,
  status client_status not null default 'invited',
  invite_email text,
  invite_token uuid default uuid_generate_v4(),
  started_at date,
  ended_at date,
  created_at timestamptz not null default now(),
  unique (coach_id, client_id)
);

-- Questionario iniziale (anamnesi)
create table client_intake (
  id uuid primary key default uuid_generate_v4(),
  coach_client_id uuid not null references coach_clients(id) on delete cascade unique,
  weight_kg numeric(5,1),
  activity_level text,          -- sedentario / leggermente attivo / ...
  sports_history text,
  experience_level text,        -- novizio / principiante / intermedio / avanzato / pro
  primary_goal text,            -- recomp / massa / definizione / gara / mantenimento
  injuries text,
  limitations text,
  weekly_availability int,      -- giorni di allenamento a settimana
  training_time time,
  wake_time time,
  sleep_time time,
  meals_per_day int,
  meal_times jsonb,             -- [{"label":"Pasto 1","time":"08:00"}, ...]
  notes text,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- AREA ALLENAMENTO
-- ============================================================

-- Libreria esercizi (globali: created_by null; personalizzati: created_by = coach)
create table exercises (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text,                -- multiarticolare / isolamento / cardio ...
  muscle_group text not null,   -- petto / dorso / gambe ...
  secondary_muscles text[],
  equipment text,               -- bilanciere / manubri / macchina / cavo / corpo libero
  mechanics text,               -- spinta orizzontale / trazione verticale ...
  video_url text,
  image_url text,
  instructions text,            -- note tecniche di default
  created_by uuid references profiles(id) on delete set null,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table programs (
  id uuid primary key default uuid_generate_v4(),
  coach_client_id uuid references coach_clients(id) on delete cascade, -- null = template riutilizzabile
  created_by uuid not null references profiles(id),
  name text not null,
  goal program_goal not null default 'hypertrophy',
  status program_status not null default 'draft',
  duration_weeks int not null default 4,
  start_date date,
  notes text,
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table program_weeks (
  id uuid primary key default uuid_generate_v4(),
  program_id uuid not null references programs(id) on delete cascade,
  week_number int not null,
  label text,                   -- es. "Accumulo", "Scarico"
  notes text,
  unique (program_id, week_number)
);

create table program_workouts (
  id uuid primary key default uuid_generate_v4(),
  program_week_id uuid not null references program_weeks(id) on delete cascade,
  day_of_week int not null check (day_of_week between 1 and 7),
  name text not null,           -- es. "Pull Lower"
  goal text,                    -- es. "Forza e ipertrofia"
  estimated_duration_min int,
  coach_notes text,
  sort_order int not null default 0
);

create table workout_exercises (
  id uuid primary key default uuid_generate_v4(),
  program_workout_id uuid not null references program_workouts(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  sort_order int not null default 0,
  method set_type not null default 'normal',   -- top set / back off ...
  superset_group int,           -- stesso numero = eseguiti in superset
  coach_notes text
);

-- Serie PRESCRITTE dal coach
create table exercise_sets (
  id uuid primary key default uuid_generate_v4(),
  workout_exercise_id uuid not null references workout_exercises(id) on delete cascade,
  set_number int not null,
  set_type set_type not null default 'normal',
  reps_min int,
  reps_max int,
  target_rpe numeric(3,1),
  target_load_kg numeric(6,2),
  rest_seconds int,
  tempo text,                   -- es. "3-1-1-0"
  unique (workout_exercise_id, set_number)
);

-- Allenamento ESEGUITO dal cliente
create table workout_logs (
  id uuid primary key default uuid_generate_v4(),
  program_workout_id uuid references program_workouts(id) on delete set null,
  client_id uuid not null references profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_min int,
  total_volume_kg numeric(10,1),
  client_notes text,
  created_at timestamptz not null default now()
);

-- Ogni serie ESEGUITA
create table set_logs (
  id uuid primary key default uuid_generate_v4(),
  workout_log_id uuid not null references workout_logs(id) on delete cascade,
  workout_exercise_id uuid references workout_exercises(id) on delete set null,
  exercise_id uuid not null references exercises(id),
  set_number int not null,
  load_kg numeric(6,2),
  reps int,
  rpe numeric(3,1),
  notes text,
  video_url text,
  completed boolean not null default true,
  logged_at timestamptz not null default now()
);

-- Record personali (calcolati automaticamente)
create table personal_records (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references profiles(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  record_type text not null check (record_type in ('max_load', 'max_reps', 'max_volume', 'estimated_1rm')),
  value numeric(10,2) not null,
  achieved_at date not null,
  set_log_id uuid references set_logs(id) on delete set null,
  unique (client_id, exercise_id, record_type)
);

-- ============================================================
-- AREA NUTRIZIONE
-- ============================================================

create table nutrition_plans (
  id uuid primary key default uuid_generate_v4(),
  coach_client_id uuid not null references coach_clients(id) on delete cascade,
  created_by uuid not null references profiles(id),
  name text not null,
  status program_status not null default 'draft',
  duration_weeks int not null default 4,
  start_date date,
  bmr_kcal int,                 -- metabolismo basale calcolato
  tdee_kcal int,                -- fabbisogno totale calcolato
  calorie_mode text not null default 'manual' check (calorie_mode in ('manual', 'automatic')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Rotazione calorie: un valore per giorno della settimana
create table nutrition_days (
  id uuid primary key default uuid_generate_v4(),
  nutrition_plan_id uuid not null references nutrition_plans(id) on delete cascade,
  week_number int not null default 1,
  day_of_week int not null check (day_of_week between 1 and 7),
  day_type day_type not null default 'training',
  kcal int not null,
  protein_g int not null,
  carbs_g int not null,
  fat_g int not null,
  unique (nutrition_plan_id, week_number, day_of_week)
);

create table meals (
  id uuid primary key default uuid_generate_v4(),
  nutrition_day_id uuid not null references nutrition_days(id) on delete cascade,
  name text not null,           -- Colazione, Pranzo...
  meal_time time,
  sort_order int not null default 0,
  notes text
);

-- Database alimenti
create table foods (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  brand text,
  barcode text,
  kcal_per_100g numeric(7,1) not null,
  protein_per_100g numeric(6,1) not null default 0,
  carbs_per_100g numeric(6,1) not null default 0,
  fat_per_100g numeric(6,1) not null default 0,
  fiber_per_100g numeric(6,1),
  created_by uuid references profiles(id) on delete set null,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table meal_foods (
  id uuid primary key default uuid_generate_v4(),
  meal_id uuid not null references meals(id) on delete cascade,
  food_id uuid not null references foods(id),
  quantity_g numeric(7,1) not null,
  substitutes jsonb,            -- [{"food_id":"...","quantity_g":120}, ...]
  sort_order int not null default 0
);

create table food_favorites (
  profile_id uuid not null references profiles(id) on delete cascade,
  food_id uuid not null references foods(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, food_id)
);

-- ============================================================
-- AREA PROGRESSI
-- ============================================================

create table checkins (
  id uuid primary key default uuid_generate_v4(),
  coach_client_id uuid not null references coach_clients(id) on delete cascade,
  week_start date not null,
  status checkin_status not null default 'pending',
  weight_kg numeric(5,1),
  sleep_quality int check (sleep_quality between 1 and 10),
  stress_level int check (stress_level between 1 and 10),
  energy_level int check (energy_level between 1 and 10),
  hunger_level int check (hunger_level between 1 and 10),
  muscle_soreness int check (muscle_soreness between 1 and 10),
  joint_stress int check (joint_stress between 1 and 10),
  recovery int check (recovery between 1 and 10),
  training_adherence int check (training_adherence between 0 and 100),
  nutrition_adherence int check (nutrition_adherence between 0 and 100),
  avg_steps int,
  client_notes text,
  coach_feedback text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (coach_client_id, week_start)
);

create table checkin_photos (
  id uuid primary key default uuid_generate_v4(),
  checkin_id uuid not null references checkins(id) on delete cascade,
  pose text not null check (pose in ('front', 'side_right', 'side_left', 'back')),
  storage_path text not null,   -- percorso nel bucket privato
  created_at timestamptz not null default now()
);

create table body_measurements (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references profiles(id) on delete cascade,
  measured_at date not null default current_date,
  waist_cm numeric(5,1),
  hips_cm numeric(5,1),
  chest_cm numeric(5,1),
  arm_cm numeric(5,1),
  thigh_cm numeric(5,1),
  calf_cm numeric(5,1),
  neck_cm numeric(5,1),
  created_at timestamptz not null default now()
);

-- ============================================================
-- AREA COMUNICAZIONE
-- ============================================================

create table conversations (
  id uuid primary key default uuid_generate_v4(),
  coach_client_id uuid not null references coach_clients(id) on delete cascade unique,
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text,
  attachment_path text,
  status message_status not null default 'sent',
  created_at timestamptz not null default now()
);

-- ============================================================
-- AREA BUSINESS
-- ============================================================

create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan_key text not null,       -- free / athlete_pro / coach_starter / coach_pro / coach_elite / gym
  status subscription_status not null default 'trialing',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (profile_id is not null or organization_id is not null)
);

create table payments (
  id uuid primary key default uuid_generate_v4(),
  subscription_id uuid references subscriptions(id) on delete set null,
  stripe_invoice_id text unique,
  amount_cents int not null,
  currency text not null default 'eur',
  status text not null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- AREA AI
-- ============================================================

create table ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  coach_client_id uuid references coach_clients(id) on delete set null,
  title text,
  messages jsonb not null default '[]', -- [{"role":"user","content":"..."}, ...]
  total_tokens int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- INDICI
-- ============================================================

create index idx_coach_clients_coach on coach_clients(coach_id) where status = 'active';
create index idx_coach_clients_client on coach_clients(client_id);
create index idx_exercises_muscle on exercises(muscle_group);
create index idx_exercises_name_trgm on exercises using gin (name gin_trgm_ops);
create index idx_programs_client on programs(coach_client_id);
create index idx_program_weeks_program on program_weeks(program_id);
create index idx_program_workouts_week on program_workouts(program_week_id);
create index idx_workout_exercises_workout on workout_exercises(program_workout_id);
create index idx_exercise_sets_we on exercise_sets(workout_exercise_id);
create index idx_workout_logs_client_date on workout_logs(client_id, started_at desc);
create index idx_set_logs_workout on set_logs(workout_log_id);
create index idx_set_logs_exercise_date on set_logs(exercise_id, logged_at desc);
create index idx_pr_client_exercise on personal_records(client_id, exercise_id);
create index idx_nutrition_plans_client on nutrition_plans(coach_client_id);
create index idx_nutrition_days_plan on nutrition_days(nutrition_plan_id);
create index idx_meals_day on meals(nutrition_day_id);
create index idx_foods_name_trgm on foods using gin (name gin_trgm_ops);
create index idx_foods_barcode on foods(barcode) where barcode is not null;
create index idx_meal_foods_meal on meal_foods(meal_id);
create index idx_checkins_client_week on checkins(coach_client_id, week_start desc);
create index idx_measurements_client on body_measurements(client_id, measured_at desc);
create index idx_messages_conversation on messages(conversation_id, created_at desc);
create index idx_subscriptions_profile on subscriptions(profile_id);
create index idx_ai_conversations_profile on ai_conversations(profile_id);

-- ============================================================
-- FUNZIONI DI SUPPORTO
-- ============================================================

-- Crea automaticamente il profilo alla registrazione
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- True se l'utente corrente è il coach (attivo) del cliente indicato
create or replace function is_coach_of(p_client_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from coach_clients
    where coach_id = auth.uid()
      and client_id = p_client_id
      and status in ('active', 'paused')
  );
$$;

-- True se l'utente corrente partecipa alla relazione coach-cliente indicata
create or replace function is_in_coach_client(p_cc_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from coach_clients
    where id = p_cc_id
      and (coach_id = auth.uid() or client_id = auth.uid())
  );
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table coach_clients enable row level security;
alter table client_intake enable row level security;
alter table exercises enable row level security;
alter table programs enable row level security;
alter table program_weeks enable row level security;
alter table program_workouts enable row level security;
alter table workout_exercises enable row level security;
alter table exercise_sets enable row level security;
alter table workout_logs enable row level security;
alter table set_logs enable row level security;
alter table personal_records enable row level security;
alter table nutrition_plans enable row level security;
alter table nutrition_days enable row level security;
alter table meals enable row level security;
alter table foods enable row level security;
alter table meal_foods enable row level security;
alter table food_favorites enable row level security;
alter table checkins enable row level security;
alter table checkin_photos enable row level security;
alter table body_measurements enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table subscriptions enable row level security;
alter table payments enable row level security;
alter table ai_conversations enable row level security;

-- ---------- profiles ----------
create policy "own profile read" on profiles for select
  using (id = auth.uid() or is_coach_of(id));
create policy "own profile update" on profiles for update
  using (id = auth.uid());

-- ---------- organizations ----------
create policy "org members read" on organizations for select
  using (exists (select 1 from organization_members m
                 where m.organization_id = id and m.profile_id = auth.uid()));
create policy "org create" on organizations for insert
  with check (created_by = auth.uid());
create policy "org owner update" on organizations for update
  using (exists (select 1 from organization_members m
                 where m.organization_id = id and m.profile_id = auth.uid()
                   and m.role = 'owner'));

create policy "org members read members" on organization_members for select
  using (exists (select 1 from organization_members m
                 where m.organization_id = organization_members.organization_id
                   and m.profile_id = auth.uid()));
create policy "org owner manage members" on organization_members for all
  using (exists (select 1 from organization_members m
                 where m.organization_id = organization_members.organization_id
                   and m.profile_id = auth.uid() and m.role in ('owner', 'manager')));

-- ---------- coach_clients ----------
create policy "cc participants read" on coach_clients for select
  using (coach_id = auth.uid() or client_id = auth.uid());
create policy "coach creates clients" on coach_clients for insert
  with check (coach_id = auth.uid());
create policy "coach updates clients" on coach_clients for update
  using (coach_id = auth.uid());
create policy "coach deletes clients" on coach_clients for delete
  using (coach_id = auth.uid());

-- ---------- client_intake ----------
create policy "intake participants" on client_intake for select
  using (is_in_coach_client(coach_client_id));
create policy "intake insert" on client_intake for insert
  with check (is_in_coach_client(coach_client_id));
create policy "intake update" on client_intake for update
  using (is_in_coach_client(coach_client_id));

-- ---------- exercises ----------
create policy "exercises read" on exercises for select
  using (is_public = true or created_by = auth.uid());
create policy "exercises insert" on exercises for insert
  with check (created_by = auth.uid());
create policy "exercises update own" on exercises for update
  using (created_by = auth.uid());
create policy "exercises delete own" on exercises for delete
  using (created_by = auth.uid());

-- ---------- programs (e discendenti) ----------
create policy "programs read" on programs for select
  using (created_by = auth.uid() or is_in_coach_client(coach_client_id));
create policy "programs write" on programs for insert
  with check (created_by = auth.uid());
create policy "programs update" on programs for update
  using (created_by = auth.uid());
create policy "programs delete" on programs for delete
  using (created_by = auth.uid());

create policy "weeks via program" on program_weeks for all
  using (exists (select 1 from programs p where p.id = program_id
                 and (p.created_by = auth.uid() or is_in_coach_client(p.coach_client_id))))
  with check (exists (select 1 from programs p where p.id = program_id
                      and p.created_by = auth.uid()));

create policy "workouts via week" on program_workouts for all
  using (exists (select 1 from program_weeks w join programs p on p.id = w.program_id
                 where w.id = program_week_id
                   and (p.created_by = auth.uid() or is_in_coach_client(p.coach_client_id))))
  with check (exists (select 1 from program_weeks w join programs p on p.id = w.program_id
                      where w.id = program_week_id and p.created_by = auth.uid()));

create policy "wex via workout" on workout_exercises for all
  using (exists (select 1 from program_workouts pw
                 join program_weeks w on w.id = pw.program_week_id
                 join programs p on p.id = w.program_id
                 where pw.id = program_workout_id
                   and (p.created_by = auth.uid() or is_in_coach_client(p.coach_client_id))))
  with check (exists (select 1 from program_workouts pw
                      join program_weeks w on w.id = pw.program_week_id
                      join programs p on p.id = w.program_id
                      where pw.id = program_workout_id and p.created_by = auth.uid()));

create policy "sets via wex" on exercise_sets for all
  using (exists (select 1 from workout_exercises we
                 join program_workouts pw on pw.id = we.program_workout_id
                 join program_weeks w on w.id = pw.program_week_id
                 join programs p on p.id = w.program_id
                 where we.id = workout_exercise_id
                   and (p.created_by = auth.uid() or is_in_coach_client(p.coach_client_id))))
  with check (exists (select 1 from workout_exercises we
                      join program_workouts pw on pw.id = we.program_workout_id
                      join program_weeks w on w.id = pw.program_week_id
                      join programs p on p.id = w.program_id
                      where we.id = workout_exercise_id and p.created_by = auth.uid()));

-- ---------- workout_logs / set_logs ----------
create policy "logs owner or coach read" on workout_logs for select
  using (client_id = auth.uid() or is_coach_of(client_id));
create policy "logs owner write" on workout_logs for insert
  with check (client_id = auth.uid());
create policy "logs owner update" on workout_logs for update
  using (client_id = auth.uid());

create policy "set logs via workout log" on set_logs for select
  using (exists (select 1 from workout_logs wl where wl.id = workout_log_id
                 and (wl.client_id = auth.uid() or is_coach_of(wl.client_id))));
create policy "set logs owner write" on set_logs for insert
  with check (exists (select 1 from workout_logs wl where wl.id = workout_log_id
                      and wl.client_id = auth.uid()));
create policy "set logs owner update" on set_logs for update
  using (exists (select 1 from workout_logs wl where wl.id = workout_log_id
                 and wl.client_id = auth.uid()));

create policy "pr read" on personal_records for select
  using (client_id = auth.uid() or is_coach_of(client_id));
create policy "pr write own" on personal_records for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- ---------- nutrizione ----------
create policy "nplans participants" on nutrition_plans for select
  using (is_in_coach_client(coach_client_id));
create policy "nplans coach write" on nutrition_plans for insert
  with check (created_by = auth.uid() and is_in_coach_client(coach_client_id));
create policy "nplans coach update" on nutrition_plans for update
  using (created_by = auth.uid());
create policy "nplans coach delete" on nutrition_plans for delete
  using (created_by = auth.uid());

create policy "ndays via plan" on nutrition_days for all
  using (exists (select 1 from nutrition_plans np where np.id = nutrition_plan_id
                 and is_in_coach_client(np.coach_client_id)))
  with check (exists (select 1 from nutrition_plans np where np.id = nutrition_plan_id
                      and np.created_by = auth.uid()));

create policy "meals via day" on meals for all
  using (exists (select 1 from nutrition_days nd join nutrition_plans np on np.id = nd.nutrition_plan_id
                 where nd.id = nutrition_day_id and is_in_coach_client(np.coach_client_id)))
  with check (exists (select 1 from nutrition_days nd join nutrition_plans np on np.id = nd.nutrition_plan_id
                      where nd.id = nutrition_day_id and np.created_by = auth.uid()));

create policy "foods read" on foods for select
  using (is_public = true or created_by = auth.uid());
create policy "foods insert" on foods for insert
  with check (created_by = auth.uid());
create policy "foods update own" on foods for update
  using (created_by = auth.uid());

create policy "mfoods via meal" on meal_foods for all
  using (exists (select 1 from meals m
                 join nutrition_days nd on nd.id = m.nutrition_day_id
                 join nutrition_plans np on np.id = nd.nutrition_plan_id
                 where m.id = meal_id and is_in_coach_client(np.coach_client_id)))
  with check (exists (select 1 from meals m
                      join nutrition_days nd on nd.id = m.nutrition_day_id
                      join nutrition_plans np on np.id = nd.nutrition_plan_id
                      where m.id = meal_id and np.created_by = auth.uid()));

create policy "favorites own" on food_favorites for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ---------- progressi ----------
create policy "checkins participants read" on checkins for select
  using (is_in_coach_client(coach_client_id));
create policy "checkins insert" on checkins for insert
  with check (is_in_coach_client(coach_client_id));
create policy "checkins update" on checkins for update
  using (is_in_coach_client(coach_client_id));

create policy "cphotos via checkin" on checkin_photos for all
  using (exists (select 1 from checkins c where c.id = checkin_id
                 and is_in_coach_client(c.coach_client_id)))
  with check (exists (select 1 from checkins c where c.id = checkin_id
                      and is_in_coach_client(c.coach_client_id)));

create policy "measurements read" on body_measurements for select
  using (client_id = auth.uid() or is_coach_of(client_id));
create policy "measurements own write" on body_measurements for insert
  with check (client_id = auth.uid() or is_coach_of(client_id));
create policy "measurements own update" on body_measurements for update
  using (client_id = auth.uid() or is_coach_of(client_id));

-- ---------- chat ----------
create policy "conversations participants" on conversations for select
  using (is_in_coach_client(coach_client_id));
create policy "conversations create" on conversations for insert
  with check (is_in_coach_client(coach_client_id));

create policy "messages participants read" on messages for select
  using (exists (select 1 from conversations c where c.id = conversation_id
                 and is_in_coach_client(c.coach_client_id)));
create policy "messages send" on messages for insert
  with check (sender_id = auth.uid()
              and exists (select 1 from conversations c where c.id = conversation_id
                          and is_in_coach_client(c.coach_client_id)));
create policy "messages update status" on messages for update
  using (exists (select 1 from conversations c where c.id = conversation_id
                 and is_in_coach_client(c.coach_client_id)));

-- ---------- business ----------
-- Nota: scritte SOLO dal server (webhook Stripe con service key, che bypassa RLS)
create policy "subscriptions own read" on subscriptions for select
  using (profile_id = auth.uid()
         or exists (select 1 from organization_members m
                    where m.organization_id = subscriptions.organization_id
                      and m.profile_id = auth.uid() and m.role = 'owner'));

create policy "payments own read" on payments for select
  using (exists (select 1 from subscriptions s where s.id = subscription_id
                 and s.profile_id = auth.uid()));

-- ---------- AI ----------
create policy "ai own" on ai_conversations for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ============================================================
-- STORAGE BUCKETS (foto check-in, video esercizi, avatar)
-- ============================================================
insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('exercise-media', 'exercise-media', true),
  ('checkin-photos', 'checkin-photos', false),
  ('chat-attachments', 'chat-attachments', false);

-- Ognuno carica solo nella propria cartella (path: <user_id>/...)
create policy "avatar upload own" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar read" on storage.objects for select
  using (bucket_id = 'avatars');

create policy "exercise media read" on storage.objects for select
  using (bucket_id = 'exercise-media');
create policy "exercise media upload own" on storage.objects for insert
  with check (bucket_id = 'exercise-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "checkin photos own folder" on storage.objects for insert
  with check (bucket_id = 'checkin-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "checkin photos read own or coach" on storage.objects for select
  using (bucket_id = 'checkin-photos'
         and ((storage.foldername(name))[1] = auth.uid()::text
              or is_coach_of(((storage.foldername(name))[1])::uuid)));

create policy "chat attachments upload" on storage.objects for insert
  with check (bucket_id = 'chat-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "chat attachments read" on storage.objects for select
  using (bucket_id = 'chat-attachments');
