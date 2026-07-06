# 🗺️ Roadmap di Sviluppo
## Workout Companion AI — da MVP a piattaforma completa

> **Legenda complessità**: 🟢 semplice · 🟡 media · 🔴 alta
> **Priorità**: P0 = indispensabile · P1 = importante · P2 = desiderabile
> I tempi sono stimati considerando lo sviluppo assistito dall'AI (io scrivo il codice, tu guidi le decisioni).

---

## 🎯 MVP — "Il coach può lavorare" (8-10 settimane)

**Obiettivo**: un coach reale può gestire clienti veri end-to-end. Niente fronzoli.

| # | Funzionalità | Priorità | Complessità | Tempo |
|---|---|---|---|---|
| 1 | Setup progetto: monorepo, Supabase, Vercel, GitHub | P0 | 🟢 | 3-4 giorni |
| 2 | Autenticazione (registrazione, login, ruoli coach/atleta) | P0 | 🟢 | 3-4 giorni |
| 3 | Database completo + RLS (già progettato ✅) | P0 | 🟡 | 2-3 giorni |
| 4 | Portale coach: gestione clienti + invito + anamnesi | P0 | 🟡 | 1 settimana |
| 5 | Costruttore programmi (settimane, esercizi, serie, RPE) + libreria 200 esercizi | P0 | 🔴 | 2 settimane |
| 6 | App mobile: login, home "piano del giorno", **workout tracker live** (carichi, reps, RPE, timer, salvataggio automatico) | P0 | 🔴 | 2 settimane |
| 7 | Check-in settimanale (peso, misure, foto, benessere) + review coach | P0 | 🟡 | 1 settimana |
| 8 | Chat coach-cliente (Realtime) | P1 | 🟡 | 4-5 giorni |
| 9 | Analytics base: volume, progressione carichi, PR automatici, peso corporeo | P1 | 🟡 | 1 settimana |
| 10 | Pagamenti Stripe: piani coach, trial 14gg, customer portal | P0 | 🟡 | 4-5 giorni |

**Criterio di successo**: 5-10 coach beta usano la piattaforma con clienti reali per 4 settimane.

---

## 🚀 Versione 1.0 — "Prodotto completo vendibile" (+8 settimane)

| # | Funzionalità | Priorità | Complessità | Tempo |
|---|---|---|---|---|
| 1 | **Modulo nutrizione completo**: piani, macro per giorno, rotazione calorie, TDEE/BMR automatici (come screenshot) | P0 | 🔴 | 2,5 settimane |
| 2 | Food database + pasti + sostituzioni + preferiti | P0 | 🔴 | 2 settimane |
| 3 | **AI Coach v1**: analisi progressi, report automatici check-in, suggerimenti carico | P0 | 🔴 | 2 settimane |
| 4 | Dashboard business coach: revenue, clienti a rischio, KPI | P1 | 🟡 | 1 settimana |
| 5 | Template programmi riutilizzabili + duplica piano | P1 | 🟢 | 3 giorni |
| 6 | Notifiche push (allenamento, check-in, messaggi) | P1 | 🟡 | 4 giorni |
| 7 | Pubblicazione App Store + Google Play | P0 | 🟡 | 1 settimana |
| 8 | Meal tracking lato atleta (spunta pasti, aderenza) | P1 | 🟡 | 4 giorni |

---

## 📈 Versione 2.0 — "Espansione B2B" (+10 settimane)

| # | Funzionalità | Priorità | Complessità |
|---|---|---|---|
| 1 | Organizzazioni: team coach, ruoli e permessi, assegnazione clienti | P0 | 🔴 |
| 2 | White label: logo, colori, dominio personalizzato | P0 | 🔴 |
| 3 | Report business aggregati per palestre | P1 | 🟡 |
| 4 | Barcode scanner alimenti (mobile) | P1 | 🟡 |
| 5 | AI Coach v2: chat conversazionale per l'atleta, modifiche schede suggerite al coach | P1 | 🔴 |
| 6 | Modalità offline completa del tracker | P1 | 🔴 |
| 7 | Fatturazione coach→cliente (Stripe Connect) | P2 | 🔴 |
| 8 | Esportazione PDF (schede, piani, report) | P2 | 🟢 |

---

## 🌍 Versione 3.0 — "Piattaforma & ecosistema" (+12 settimane)

| # | Funzionalità | Priorità | Complessità |
|---|---|---|---|
| 1 | Integrazione wearable (Apple Health, Google Fit, Garmin) | P1 | 🔴 |
| 2 | Marketplace programmi (i coach vendono template) | P1 | 🔴 |
| 3 | Enterprise per catene: multi-sede, SSO, report consolidati | P1 | 🔴 |
| 4 | AI video form-check (analisi tecnica esecuzione) | P2 | 🔴 |
| 5 | Moduli endurance avanzati (zone, TSS, piani running) | P2 | 🔴 |
| 6 | API pubblica per integrazioni | P2 | 🟡 |

---

## Principi guida

1. **Prima il coach, poi l'atleta**: il coach paga, l'atleta usa. L'MVP conquista il coach.
2. **Ogni versione dev'essere vendibile**: mai lavorare 6 mesi senza utenti reali.
3. **Feedback loop**: PostHog + interviste ai coach beta decidono le priorità reali.
4. **Il tracker mobile è sacro**: è l'esperienza quotidiana dell'atleta; se è lento o scomodo, il coach perde clienti e noi perdiamo il coach.
