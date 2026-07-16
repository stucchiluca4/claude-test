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

## ⚡ Avvio rapido sul tuo computer (1 doppio click)

1. Scarica UN solo file: [`avvia-windows.bat`](./avvia-windows.bat) (Windows) o [`avvia-mac.sh`](./avvia-mac.sh) (Mac/Linux) — aprilo su GitHub e usa l'icona ⤓ "Download raw file"
2. Fai **doppio click** sul file scaricato (su Mac: apri il Terminale e trascina il file dentro, poi Invio)
3. Lo script fa tutto da solo: controlla Git/Node, scarica il progetto, ti chiede le 2 chiavi Supabase (solo la prima volta), installa e apre **http://localhost:3000** nel browser

> Prerequisiti (solo la prima volta): [Node.js LTS](https://nodejs.org) e [Git](https://git-scm.com) — installazione avanti-avanti-fine.

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
- [x] Fase 2.1 — Funzioni avanzate coach: valutazione corporea (plicometria), TDEE Katch-McArdle + PAL, progressioni BULK/CUT, listino coaching, analisi volume Push/Pull/Gambe
- [x] Fase 2.2 — Biofeedback giornaliero (app mobile) + dashboard monitoraggio cliente + panoramica piani con grafici + dashboard coach avanzata
- [ ] Fase 3 — Setup account e collegamento (Supabase, Vercel, Stripe) → segui la [guida](./docs/06-SETUP-GUIDA-PRINCIPIANTI.md)
- [ ] Fase 4 — Beta test con i primi coach reali
