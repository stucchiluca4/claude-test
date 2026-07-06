# 💪 Workout Companion AI

**Piattaforma fitness premium B2C + B2B** — allenamento, nutrizione, check-in, chat e AI Coach per atleti, personal trainer e palestre.

> 🧭 **Da dove iniziare**: leggi i documenti nella cartella [`docs/`](./docs) in ordine.

| Documento | Contenuto |
|---|---|
| [01-PRD](./docs/01-PRD.md) | Visione, missione, target, casi d'uso, monetizzazione |
| [02-ARCHITETTURA](./docs/02-ARCHITETTURA.md) | Come funziona il sistema + mini-guide di ogni strumento |
| [03-DATABASE-SCHEMA](./docs/03-DATABASE-SCHEMA.md) | Le 24 tabelle spiegate + sicurezza RLS |
| [04-STRUTTURA-REPOSITORY](./docs/04-STRUTTURA-REPOSITORY.md) | Come è organizzato il codice |
| [05-ROADMAP](./docs/05-ROADMAP.md) | MVP → v1.0 → v2.0 → v3.0 con priorità e tempi |
| [06-SETUP-GUIDA-PRINCIPIANTI](./docs/06-SETUP-GUIDA-PRINCIPIANTI.md) | ⭐ Setup passo-passo (account, chiavi, dove cliccare) |
| [07-UI-UX-WIREFRAMES](./docs/07-UI-UX-WIREFRAMES.md) | Design system + wireframe di tutte le schermate |

## Stack

Next.js (Vercel) · React Native Expo · Supabase (PostgreSQL, Auth, Storage, Realtime) · Stripe · OpenAI · PostHog

## Struttura del codice

| Cartella | Contenuto |
|---|---|
| [`apps/web`](./apps/web) | 🖥️ Portale coach (Next.js) — dashboard, clienti, programmi, nutrizione, check-in, chat, pagamenti |
| [`apps/mobile`](./apps/mobile) | 📱 App atleta (React Native + Expo) — workout tracker, nutrizione, check-in, chat |
| [`packages/shared`](./packages/shared) | 🔄 Formule (TDEE, BMR, 1RM), costanti e tipi condivisi |
| [`supabase`](./supabase) | 🗄️ Schema database, dati iniziali (150 esercizi, 130 alimenti), Edge Functions (AI Coach) |

## Stato del progetto

- [x] Fase 1 — Documentazione completa (PRD, architettura, database, roadmap)
- [x] Schema database SQL pronto ([`supabase/migrations/00001_initial_schema.sql`](./supabase/migrations/00001_initial_schema.sql))
- [x] Fase 2 — Codebase MVP: monorepo, portale web coach, app mobile, Edge Function AI, pagamenti Stripe
- [ ] Fase 3 — Setup account e collegamento (Supabase, Vercel, Stripe) → segui la [guida](./docs/06-SETUP-GUIDA-PRINCIPIANTI.md)
- [ ] Fase 4 — Beta test con i primi coach reali
