# 📘 Product Requirement Document (PRD)
## Workout Companion AI — Piattaforma Fitness Premium B2C + B2B

**Versione:** 1.0 · **Data:** 06/07/2026 · **Stato:** Approvato per sviluppo MVP

---

## 1. Visione Prodotto

> **Diventare il sistema operativo del fitness coaching**: un'unica piattaforma dove coach, palestre e atleti gestiscono allenamento, nutrizione, progressi e comunicazione — potenziata dall'intelligenza artificiale.

Oggi il mercato è frammentato: i coach usano Excel per le schede, WhatsApp per la chat, PDF per i piani alimentari e app separate per il tracking. **Workout Companion AI unifica tutto** in un'esperienza premium in dark mode, con un AI Coach che assiste sia il professionista che l'atleta.

## 2. Missione

Dare ai coach strumenti da azienda enterprise a prezzo da freelancer, e agli atleti un'esperienza di allenamento guidata, misurabile e motivante — riducendo del 70% il tempo amministrativo dei coach e aumentando l'aderenza dei clienti ai programmi.

## 3. Target Utenti

### 3.1 B2C (utente finale)
| Segmento | Bisogno principale | Caratteristiche |
|---|---|---|
| **Bodybuilding** | Tracking volume, progressione carichi, macro precise | 20-40 anni, molto motivati, disposti a pagare |
| **Powerlifting** | RPE, top set/back off, stima 1RM, periodizzazione | Cercano precisione tecnica |
| **Running/Endurance** | Piani settimanali, zone di lavoro, recupero | Volume cardio, integrazione futura con wearable |
| **Wellness generico** | Semplicità, abitudini, check-in, motivazione | Meno esperti, serve UX guidata |

### 3.2 B2B (professionisti — segmento prioritario 🎯)
| Segmento | Bisogno principale | Dimensione |
|---|---|---|
| **Personal Trainer / Coach Online** | Gestire 10-100 clienti senza Excel | Cliente tipo MVP |
| **Studi nutrizionali** | Piani alimentari, check-in, foto progressi | Verticale nutrizione |
| **Palestre** | Team di coach, assegnazione clienti, branding | Multi-coach, ruoli |
| **Catene fitness** | White label, report aggregati, fatturazione | Enterprise (v2.0+) |

**Persona primaria (MVP): "Coach Mario"** — personal trainer online, 30 clienti, fattura 3-5k€/mese, oggi usa Excel + WhatsApp + Google Drive. Perde 10+ ore/settimana in amministrazione. Pagherebbe 50-100€/mese per uno strumento unico.

## 4. Casi d'Uso Principali

1. **Onboarding cliente**: il coach invita un cliente → il cliente compila l'anamnesi (anagrafica, obiettivi, infortuni, abitudini) → il coach riceve il profilo completo.
2. **Creazione programma**: il coach costruisce una scheda multi-settimana con esercizi da libreria (serie, reps, RPE, recupero, video) e la assegna al cliente.
3. **Allenamento live**: il cliente apre l'app mobile, vede il workout del giorno, inserisce carichi/reps/RPE con timer di recupero; tutto si salva automaticamente.
4. **Piano nutrizionale**: il coach imposta calorie e macro per giorno della settimana (rotazione calorie, giorni ON/OFF), con calcolo automatico TDEE/BMR.
5. **Check-in settimanale**: il cliente invia peso, circonferenze, foto, sonno, energia, aderenza → il coach vede il confronto con le settimane precedenti.
6. **AI Coach**: il coach chiede "analizza i progressi di Luca" → l'AI genera un report; il cliente chiede "posso sostituire il pollo?" → l'AI risponde nei limiti del piano.
7. **Business**: il coach vede dashboard con clienti attivi, a rischio abbandono, revenue e KPI.
8. **Palestra (B2B)**: l'owner crea il team, assegna clienti ai coach, applica il proprio logo (white label).

## 5. Monetizzazione

### Modello: SaaS a sottoscrizione (Stripe), freemium + trial

| Piano | Prezzo | Target | Include |
|---|---|---|---|
| **Free** | 0€ | Atleta self-coached | Tracking base, 1 programma, no AI |
| **Athlete Pro** | 9,99€/mese · 79€/anno | B2C | AI Coach, analytics complete, nutrizione |
| **Coach Starter** | 29€/mese | PT fino a 15 clienti | Portale coach completo |
| **Coach Pro** | 69€/mese | PT fino a 50 clienti | + AI report, branding base |
| **Coach Elite** | 129€/mese | Clienti illimitati | + white label, priorità supporto |
| **Gym/Team** | da 249€/mese | Palestre | Multi-coach, ruoli, report business |

- **Trial gratuito**: 14 giorni su tutti i piani a pagamento (senza carta per B2C, con carta per B2B).
- **Revenue secondarie (v2+)**: marketplace programmi, commissione su pagamenti coach→cliente, add-on AI.
- **Metriche chiave**: MRR, churn mensile (<5% target), LTV/CAC > 3, attivazione (primo programma creato entro 7 giorni).

## 6. Architettura (sintesi — dettagli nel doc 02)

- **Frontend web (portale coach + admin)**: Next.js su Vercel
- **App mobile (atleta)**: React Native + Expo
- **Backend & Database**: Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions)
- **Pagamenti**: Stripe (subscriptions + webhooks)
- **AI**: OpenAI API tramite Edge Functions (mai chiamata dal client)
- **Analytics prodotto**: PostHog
- **Codice**: GitHub (monorepo)

## 7. Requisiti Non Funzionali

- **Sicurezza**: Row Level Security su ogni tabella; un coach vede SOLO i propri clienti; GDPR-ready (dati salute = categoria speciale → consenso esplicito, export/cancellazione dati).
- **Performance**: workout tracker utilizzabile offline-first (v1.1), salvataggio automatico < 1s.
- **Lingue**: IT + EN dal lancio (i18n dal giorno 1).
- **Design**: dark mode primario, light mode secondario, stile SaaS premium (riferimenti: screenshot PT Coach Pro, Trainerize, PT Distinction).

## 8. Cosa NON è in scope per l'MVP

❌ Barcode scanner · ❌ White label · ❌ Wearable · ❌ Marketplace · ❌ Videocall · ❌ App tablet · ❌ Fatturazione elettronica IT

(tutti pianificati in roadmap — vedi doc 05)
