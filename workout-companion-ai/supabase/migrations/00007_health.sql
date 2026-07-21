-- ============================================================
-- Workout Companion AI — Migrazione 00007
-- Integrazioni SALUTE: stato dei collegamenti + metriche normalizzate.
-- (Apple Health / Google Fit / WHOOP / Garmin… scrivono qui.)
--
-- COME SI USA: Supabase → SQL Editor → New query → incolla → Run.
-- ============================================================

-- Stato di collegamento per provider, per utente.
create table if not exists health_integrations (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  provider text not null,
  status text not null default 'disconnected' check (status in ('disconnected', 'connected', 'error')),
  connected_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  unique (profile_id, provider)
);

alter table health_integrations enable row level security;

create policy "health integ own" on health_integrations for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
-- Il coach (attivo) può vedere lo stato dei collegamenti del cliente.
create policy "health integ coach read" on health_integrations for select
  using (is_coach_of(profile_id));

-- Campioni di metriche salute normalizzati.
create table if not exists health_metrics (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  source text not null,
  metric text not null,
  value numeric(12,3) not null,
  unit text,
  measured_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (profile_id, source, metric, measured_at)
);

create index if not exists idx_health_metrics_profile
  on health_metrics(profile_id, metric, measured_at desc);

alter table health_metrics enable row level security;

create policy "health metrics own" on health_metrics for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
create policy "health metrics coach read" on health_metrics for select
  using (is_coach_of(profile_id));
