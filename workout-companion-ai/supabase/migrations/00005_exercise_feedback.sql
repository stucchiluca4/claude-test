-- ============================================================
-- Workout Companion AI — Migrazione 00005
-- FEEDBACK dell'atleta per ogni esercizio eseguito.
-- (RPE, difficoltà, energia, dolore, note libere — una riga per
--  esercizio per seduta). Alimenta riepiloghi, analytics e AI.
--
-- COME SI USA: Supabase → SQL Editor → New query →
-- incolla tutto questo file → Run (UNA volta sola).
-- ============================================================

create table if not exists exercise_feedback (
  id uuid primary key default uuid_generate_v4(),
  workout_log_id uuid not null references workout_logs(id) on delete cascade,
  workout_exercise_id uuid not null references workout_exercises(id) on delete cascade,
  exercise_id uuid references exercises(id) on delete set null, -- per analytics/AI
  rpe int check (rpe between 1 and 10),          -- sforzo percepito
  difficulty int check (difficulty between 1 and 10),
  energy int check (energy between 1 and 10),
  pain int check (pain between 1 and 10),        -- 1 = nessun fastidio
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workout_log_id, workout_exercise_id)   -- 1 feedback per esercizio per seduta
);

create index if not exists idx_exercise_feedback_log
  on exercise_feedback(workout_log_id);
create index if not exists idx_exercise_feedback_exercise
  on exercise_feedback(exercise_id, created_at desc);

alter table exercise_feedback enable row level security;

-- Sicurezza: come per set_logs, l'accesso passa dal workout_log.
-- L'ATLETA scrive/legge i propri; il COACH (attivo) legge quelli dei suoi clienti.
create policy "exercise feedback read" on exercise_feedback for select
  using (exists (select 1 from workout_logs wl where wl.id = workout_log_id
                 and (wl.client_id = auth.uid() or is_coach_of(wl.client_id))));
create policy "exercise feedback insert" on exercise_feedback for insert
  with check (exists (select 1 from workout_logs wl where wl.id = workout_log_id
                      and wl.client_id = auth.uid()));
create policy "exercise feedback update" on exercise_feedback for update
  using (exists (select 1 from workout_logs wl where wl.id = workout_log_id
                 and wl.client_id = auth.uid()));
create policy "exercise feedback delete" on exercise_feedback for delete
  using (exists (select 1 from workout_logs wl where wl.id = workout_log_id
                 and wl.client_id = auth.uid()));
