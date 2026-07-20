-- ============================================================
-- 00004 — CORREZIONI DI SICUREZZA (audit del 2026-07-20)
-- Chiude le falle emerse dall'audit: escalation di ruolo,
-- auto-nomina a coach, allegati chat esposti, ricorsione RLS
-- delle organizzazioni, accesso residuo degli ex coach,
-- modifiche dell'atleta ai contenuti del coach.
-- ============================================================

-- ---------- 1. Ruolo scelto alla registrazione ----------
-- Il ruolo arriva nei metadati del signUp e viene applicato dal trigger
-- (server-side): funziona anche con la conferma email attiva.
-- Whitelist: tutto ciò che non è 'coach' diventa 'athlete'.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    case when new.raw_user_meta_data->>'role' = 'coach'
         then 'coach'::user_role else 'athlete'::user_role end
  );
  return new;
end;
$$;

-- ---------- 2. profiles: niente auto-promozione di ruolo ----------
-- L'utente può aggiornare il proprio profilo ma NON la colonna role.
revoke update on public.profiles from anon, authenticated;
grant update (first_name, last_name, avatar_url, date_of_birth, sex,
              height_cm, locale, unit_system, timezone,
              onboarding_completed, updated_at)
  on public.profiles to authenticated;

-- ---------- 3. coach_clients: niente auto-nomina su utenti esistenti ----------
-- Un coach può creare SOLO inviti (client_id vuoto, status 'invited'):
-- il legame con un utente reale nasce solo dall'accettazione dell'invito.
drop policy "coach creates clients" on coach_clients;
create policy "coach creates clients" on coach_clients for insert
  with check (coach_id = auth.uid() and client_id is null and status = 'invited');

-- coach_id, client_id e invite_token non sono modificabili dal client.
revoke update on public.coach_clients from anon, authenticated;
grant update (status, invite_email, started_at, ended_at)
  on public.coach_clients to authenticated;

-- Accettazione invito sicura (SECURITY DEFINER: aggira i limiti di colonna
-- ma lega SEMPRE e SOLO l'utente autenticato che possiede il token).
create or replace function accept_coach_invite(p_token uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null then
    return null;
  end if;
  update coach_clients
     set client_id = auth.uid(),
         status = 'active',
         started_at = coalesce(started_at, current_date)
   where invite_token = p_token
     and client_id is null
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------- 4. Relazioni terminate: stop all'accesso dell'ex coach ----------
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
      and status <> 'ended'
  );
$$;

-- ---------- 5. Organizzazioni: via la ricorsione, dentro il creatore ----------
create or replace function is_org_member(p_org uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from organization_members
                 where organization_id = p_org and profile_id = auth.uid());
$$;

create or replace function is_org_admin(p_org uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from organization_members
                 where organization_id = p_org and profile_id = auth.uid()
                   and role::text in ('owner', 'manager'));
$$;

create or replace function is_org_owner(p_org uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from organization_members
                 where organization_id = p_org and profile_id = auth.uid()
                   and role::text = 'owner');
$$;

drop policy "org members read" on organizations;
create policy "org members read" on organizations for select
  using (is_org_member(id) or created_by = auth.uid());

drop policy "org owner update" on organizations;
create policy "org owner update" on organizations for update
  using (is_org_owner(id));

drop policy "org members read members" on organization_members;
create policy "org members read members" on organization_members for select
  using (is_org_member(organization_id));

drop policy "org owner manage members" on organization_members;
create policy "org admin manage members" on organization_members for all
  using (is_org_admin(organization_id))
  with check (is_org_admin(organization_id));

-- Chi crea un'organizzazione ne diventa automaticamente owner (niente lockout).
create or replace function handle_new_organization()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.organization_members (organization_id, profile_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (organization_id, profile_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_organization_created on organizations;
create trigger on_organization_created
  after insert on organizations
  for each row execute function handle_new_organization();

-- ---------- 6. Contenuti del coach: l'atleta legge, non modifica ----------
-- Le vecchie policy FOR ALL permettevano ai partecipanti anche
-- UPDATE e DELETE: ora scrittura riservata al creatore del programma/piano.

drop policy "weeks via program" on program_weeks;
create policy "weeks read" on program_weeks for select
  using (exists (select 1 from programs p where p.id = program_id
                 and (p.created_by = auth.uid() or is_in_coach_client(p.coach_client_id))));
create policy "weeks insert" on program_weeks for insert
  with check (exists (select 1 from programs p where p.id = program_id and p.created_by = auth.uid()));
create policy "weeks update" on program_weeks for update
  using (exists (select 1 from programs p where p.id = program_id and p.created_by = auth.uid()));
create policy "weeks delete" on program_weeks for delete
  using (exists (select 1 from programs p where p.id = program_id and p.created_by = auth.uid()));

drop policy "workouts via week" on program_workouts;
create policy "workouts read" on program_workouts for select
  using (exists (select 1 from program_weeks w join programs p on p.id = w.program_id
                 where w.id = program_week_id
                   and (p.created_by = auth.uid() or is_in_coach_client(p.coach_client_id))));
create policy "workouts insert" on program_workouts for insert
  with check (exists (select 1 from program_weeks w join programs p on p.id = w.program_id
                      where w.id = program_week_id and p.created_by = auth.uid()));
create policy "workouts update" on program_workouts for update
  using (exists (select 1 from program_weeks w join programs p on p.id = w.program_id
                 where w.id = program_week_id and p.created_by = auth.uid()));
create policy "workouts delete" on program_workouts for delete
  using (exists (select 1 from program_weeks w join programs p on p.id = w.program_id
                 where w.id = program_week_id and p.created_by = auth.uid()));

drop policy "wex via workout" on workout_exercises;
create policy "wex read" on workout_exercises for select
  using (exists (select 1 from program_workouts pw
                 join program_weeks w on w.id = pw.program_week_id
                 join programs p on p.id = w.program_id
                 where pw.id = program_workout_id
                   and (p.created_by = auth.uid() or is_in_coach_client(p.coach_client_id))));
create policy "wex insert" on workout_exercises for insert
  with check (exists (select 1 from program_workouts pw
                      join program_weeks w on w.id = pw.program_week_id
                      join programs p on p.id = w.program_id
                      where pw.id = program_workout_id and p.created_by = auth.uid()));
create policy "wex update" on workout_exercises for update
  using (exists (select 1 from program_workouts pw
                 join program_weeks w on w.id = pw.program_week_id
                 join programs p on p.id = w.program_id
                 where pw.id = program_workout_id and p.created_by = auth.uid()));
create policy "wex delete" on workout_exercises for delete
  using (exists (select 1 from program_workouts pw
                 join program_weeks w on w.id = pw.program_week_id
                 join programs p on p.id = w.program_id
                 where pw.id = program_workout_id and p.created_by = auth.uid()));

drop policy "sets via wex" on exercise_sets;
create policy "sets read" on exercise_sets for select
  using (exists (select 1 from workout_exercises we
                 join program_workouts pw on pw.id = we.program_workout_id
                 join program_weeks w on w.id = pw.program_week_id
                 join programs p on p.id = w.program_id
                 where we.id = workout_exercise_id
                   and (p.created_by = auth.uid() or is_in_coach_client(p.coach_client_id))));
create policy "sets insert" on exercise_sets for insert
  with check (exists (select 1 from workout_exercises we
                      join program_workouts pw on pw.id = we.program_workout_id
                      join program_weeks w on w.id = pw.program_week_id
                      join programs p on p.id = w.program_id
                      where we.id = workout_exercise_id and p.created_by = auth.uid()));
create policy "sets update" on exercise_sets for update
  using (exists (select 1 from workout_exercises we
                 join program_workouts pw on pw.id = we.program_workout_id
                 join program_weeks w on w.id = pw.program_week_id
                 join programs p on p.id = w.program_id
                 where we.id = workout_exercise_id and p.created_by = auth.uid()));
create policy "sets delete" on exercise_sets for delete
  using (exists (select 1 from workout_exercises we
                 join program_workouts pw on pw.id = we.program_workout_id
                 join program_weeks w on w.id = pw.program_week_id
                 join programs p on p.id = w.program_id
                 where we.id = workout_exercise_id and p.created_by = auth.uid()));

drop policy "ndays via plan" on nutrition_days;
create policy "ndays read" on nutrition_days for select
  using (exists (select 1 from nutrition_plans np where np.id = nutrition_plan_id
                 and is_in_coach_client(np.coach_client_id)));
create policy "ndays insert" on nutrition_days for insert
  with check (exists (select 1 from nutrition_plans np where np.id = nutrition_plan_id
                      and np.created_by = auth.uid()));
create policy "ndays update" on nutrition_days for update
  using (exists (select 1 from nutrition_plans np where np.id = nutrition_plan_id
                 and np.created_by = auth.uid()));
create policy "ndays delete" on nutrition_days for delete
  using (exists (select 1 from nutrition_plans np where np.id = nutrition_plan_id
                 and np.created_by = auth.uid()));

drop policy "meals via day" on meals;
create policy "meals read" on meals for select
  using (exists (select 1 from nutrition_days nd join nutrition_plans np on np.id = nd.nutrition_plan_id
                 where nd.id = nutrition_day_id and is_in_coach_client(np.coach_client_id)));
create policy "meals insert" on meals for insert
  with check (exists (select 1 from nutrition_days nd join nutrition_plans np on np.id = nd.nutrition_plan_id
                      where nd.id = nutrition_day_id and np.created_by = auth.uid()));
create policy "meals update" on meals for update
  using (exists (select 1 from nutrition_days nd join nutrition_plans np on np.id = nd.nutrition_plan_id
                 where nd.id = nutrition_day_id and np.created_by = auth.uid()));
create policy "meals delete" on meals for delete
  using (exists (select 1 from nutrition_days nd join nutrition_plans np on np.id = nd.nutrition_plan_id
                 where nd.id = nutrition_day_id and np.created_by = auth.uid()));

drop policy "mfoods via meal" on meal_foods;
create policy "mfoods read" on meal_foods for select
  using (exists (select 1 from meals m
                 join nutrition_days nd on nd.id = m.nutrition_day_id
                 join nutrition_plans np on np.id = nd.nutrition_plan_id
                 where m.id = meal_id and is_in_coach_client(np.coach_client_id)));
create policy "mfoods insert" on meal_foods for insert
  with check (exists (select 1 from meals m
                      join nutrition_days nd on nd.id = m.nutrition_day_id
                      join nutrition_plans np on np.id = nd.nutrition_plan_id
                      where m.id = meal_id and np.created_by = auth.uid()));
create policy "mfoods update" on meal_foods for update
  using (exists (select 1 from meals m
                 join nutrition_days nd on nd.id = m.nutrition_day_id
                 join nutrition_plans np on np.id = nd.nutrition_plan_id
                 where m.id = meal_id and np.created_by = auth.uid()));
create policy "mfoods delete" on meal_foods for delete
  using (exists (select 1 from meals m
                 join nutrition_days nd on nd.id = m.nutrition_day_id
                 join nutrition_plans np on np.id = nd.nutrition_plan_id
                 where m.id = meal_id and np.created_by = auth.uid()));

-- ---------- 7. Chat: contenuto dei messaggi immutabile ----------
-- I partecipanti possono aggiornare SOLO lo stato (es. segnare come letto).
revoke update on public.messages from anon, authenticated;
grant update (status) on public.messages to authenticated;

-- I partecipanti possono aggiornare last_message_at della conversazione.
revoke update on public.conversations from anon, authenticated;
grant update (last_message_at) on public.conversations to authenticated;
create policy "conversations update" on conversations for update
  using (is_in_coach_client(coach_client_id));

-- ---------- 8. programs: aggancio solo alle PROPRIE relazioni ----------
drop policy "programs write" on programs;
create policy "programs write" on programs for insert
  with check (created_by = auth.uid()
              and (coach_client_id is null or is_in_coach_client(coach_client_id)));

-- ---------- 9. Esercizi e alimenti: niente pubblicazione globale ----------
drop policy "exercises insert" on exercises;
create policy "exercises insert" on exercises for insert
  with check (created_by = auth.uid() and is_public = false);
drop policy "exercises update own" on exercises;
create policy "exercises update own" on exercises for update
  using (created_by = auth.uid())
  with check (is_public = false);

drop policy "foods insert" on foods;
create policy "foods insert" on foods for insert
  with check (created_by = auth.uid() and is_public = false);
drop policy "foods update own" on foods;
create policy "foods update own" on foods for update
  using (created_by = auth.uid())
  with check (is_public = false);

-- ---------- 10. Storage: allegati chat solo ai partecipanti ----------
create or replace function is_linked_to(p_user uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from coach_clients
    where status <> 'ended'
      and ((coach_id = p_user and client_id = auth.uid())
        or (client_id = p_user and coach_id = auth.uid()))
  );
$$;

drop policy "chat attachments read" on storage.objects;
create policy "chat attachments read" on storage.objects for select
  using (bucket_id = 'chat-attachments'
         and ((storage.foldername(name))[1] = auth.uid()::text
              or is_linked_to(((storage.foldername(name))[1])::uuid)));

-- ---------- 11. Chat in tempo reale ----------
-- La tabella non era mai stata aggiunta alla pubblicazione realtime:
-- le subscription di web e mobile non ricevevano alcun evento.
-- Idempotente: non fallisce se la tabella è già nella pubblicazione.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- ---------- 12. Allinea i profili esistenti al ruolo scelto al signup ----------
update public.profiles p
   set role = 'coach'
 where p.role = 'athlete'
   and exists (select 1 from auth.users u
               where u.id = p.id
                 and u.raw_user_meta_data->>'role' = 'coach');
