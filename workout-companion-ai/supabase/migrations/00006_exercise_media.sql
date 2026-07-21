-- ============================================================
-- Workout Companion AI — Migrazione 00006
-- ALLEGATI foto/video per esercizio eseguito (tecnica, evoluzione).
-- Bucket privato + tabella, sul modello delle foto check-in.
--
-- COME SI USA: Supabase → SQL Editor → New query →
-- incolla tutto → Run (UNA volta sola).
-- ============================================================

-- 1) Bucket privato per i media di allenamento (idempotente).
insert into storage.buckets (id, name, public)
values ('workout-media', 'workout-media', false)
on conflict (id) do nothing;

-- 2) Tabella dei riferimenti ai file (RLS via workout_logs, come exercise_feedback).
create table if not exists exercise_media (
  id uuid primary key default uuid_generate_v4(),
  workout_log_id uuid not null references workout_logs(id) on delete cascade,
  workout_exercise_id uuid references workout_exercises(id) on delete set null,
  exercise_id uuid references exercises(id) on delete set null,
  storage_path text not null,
  media_type text not null check (media_type in ('photo', 'video')),
  created_at timestamptz not null default now()
);

create index if not exists idx_exercise_media_log on exercise_media(workout_log_id);
create index if not exists idx_exercise_media_exercise on exercise_media(exercise_id, created_at desc);

alter table exercise_media enable row level security;

create policy "exercise media read" on exercise_media for select
  using (exists (select 1 from workout_logs wl where wl.id = workout_log_id
                 and (wl.client_id = auth.uid() or is_coach_of(wl.client_id))));
create policy "exercise media insert" on exercise_media for insert
  with check (exists (select 1 from workout_logs wl where wl.id = workout_log_id
                      and wl.client_id = auth.uid()));
create policy "exercise media delete" on exercise_media for delete
  using (exists (select 1 from workout_logs wl where wl.id = workout_log_id
                 and wl.client_id = auth.uid()));

-- 3) Storage: ognuno carica nella propria cartella (path: <user_id>/...),
--    lettura all'atleta proprietario e al suo coach (attivo).
create policy "workout media upload own" on storage.objects for insert
  with check (bucket_id = 'workout-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "workout media read own or coach" on storage.objects for select
  using (bucket_id = 'workout-media'
         and ((storage.foldername(name))[1] = auth.uid()::text
              or is_coach_of(((storage.foldername(name))[1])::uuid)));
create policy "workout media delete own" on storage.objects for delete
  using (bucket_id = 'workout-media' and (storage.foldername(name))[1] = auth.uid()::text);
