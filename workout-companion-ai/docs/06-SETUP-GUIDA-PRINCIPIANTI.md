# 🧑‍🏫 Setup Sviluppo Passo-Passo
## Guida per principianti assoluti — zero conoscenze richieste

> **Come funziona questa guida**: io (l'AI) scrivo tutto il codice. Tu devi solo creare gli account e copiare/incollare alcune chiavi quando te lo chiedo. Ogni passo dice esattamente **dove cliccare**. Tempo totale: **circa 1 ora**, tutto gratis.

---

## ✅ PASSO 0 — Cosa ti serve

- Un computer con un browser (Chrome, Safari…)
- Un indirizzo email
- Il tuo telefono (per testare l'app mobile più avanti)

---

## ✅ PASSO 1 — Account GitHub (5 minuti) — *probabilmente ce l'hai già*

GitHub è l'archivio del codice. Questo progetto è già su GitHub, quindi se stai leggendo questo file da lì, **hai già fatto questo passo**. ✔️

Se non hai un account:
1. Vai su **https://github.com**
2. Clicca **Sign up** (in alto a destra)
3. Inserisci email → crea password → scegli username
4. Conferma il codice ricevuto via email. Fatto.

---

## ✅ PASSO 2 — Account Supabase e creazione progetto (10 minuti)

Supabase è il "cervello" dell'app: database, login utenti e archivio file.

1. Vai su **https://supabase.com**
2. Clicca **Start your project**
3. Clicca **Continue with GitHub** → autorizza (bottone verde **Authorize supabase**)
4. Clicca **New project**
5. Compila così:
   - **Name**: `workout-companion-ai`
   - **Database Password**: clicca **Generate a password** e **SALVALA** in un posto sicuro (es. note del telefono / gestore password)
   - **Region**: **Central EU (Frankfurt)** ← importante per il GDPR
6. Clicca **Create new project** e aspetta ~2 minuti (barra verde)

### 2b. Carica il database (5 minuti)
1. Nel menu a sinistra clicca l'icona **SQL Editor** (simbolo `>_`)
2. Clicca **New query**
3. Apri il file **`supabase/migrations/00001_initial_schema.sql`** di questo repository (da GitHub: cliccaci sopra → bottone "Copy raw file" in alto a destra, icona con due quadrati)
4. Incolla tutto nell'editor SQL di Supabase
5. Clicca **Run** (in basso a destra, o Ctrl+Invio)
6. Se vedi **"Success. No rows returned"** → 🎉 il database con 24 tabelle e tutte le protezioni di sicurezza è pronto!

### 2c. Copia le chiavi (ti serviranno al Passo 5)
1. Menu a sinistra → **Project Settings** (ingranaggio) → **API Keys**
2. Tieni a portata di mano:
   - **Project URL** (tipo `https://abcdefgh.supabase.co`)
   - **anon public key** (una lunga stringa di lettere) — è la chiave "pubblica", sicura da usare nelle app
   - ⚠️ La **service_role key** invece è segretissima: non condividerla mai, nemmeno con me in chat pubblica.

---

## ✅ PASSO 3 — Account Vercel (5 minuti)

Vercel metterà il portale coach online.

1. Vai su **https://vercel.com**
2. Clicca **Sign Up**
3. Scegli **Hobby** (gratis) → **Continue with GitHub** → autorizza
4. Stop. Il collegamento del progetto lo faremo insieme quando il codice del sito sarà pronto (te lo dirò io).

---

## ✅ PASSO 4 — Account Stripe (10 minuti) — *si può rimandare*

Stripe gestirà gli abbonamenti. Per ora basta la modalità Test (soldi finti).

1. Vai su **https://stripe.com** → **Start now**
2. Registrati con email + password → verifica email
3. Quando chiede i dati dell'attività puoi cliccare **"Skip for now"** / esplorare la dashboard: in **modalità Test** (interruttore in alto a destra) non servono dati veri
4. Dashboard → **Developers → API keys**: qui vivono le chiavi test (`pk_test_...` e `sk_test_...`). Le useremo più avanti.

> 💡 I dati fiscali reali (P.IVA ecc.) serviranno SOLO quando vorrai incassare denaro vero.

---

## ✅ PASSO 5 — Account OpenAI (5 minuti) — *serve dalla fase AI Coach*

1. Vai su **https://platform.openai.com** → **Sign up**
2. Menu → **Settings → Billing**: carica un minimo (5$) e imposta un **limite mensile** (es. 10$) così non ci sono sorprese
3. Menu → **API keys** → **Create new secret key** → copia e salva (si vede una volta sola!)
4. Questa chiave la incolleremo SOLO dentro Supabase (lato server), mai nell'app: così nessuno può rubarla.

---

## ✅ PASSO 6 — Account PostHog (5 minuti) — *si può rimandare al lancio*

1. Vai su **https://posthog.com** → **Get started - free**
2. Registrati e scegli **EU Cloud** (dati in Europa = GDPR)
3. Copia la **Project API key** quando richiesta.

---

## ✅ PASSO 7 — Expo per l'app mobile (5 minuti)

1. Vai su **https://expo.dev** → **Sign up** (puoi usare GitHub)
2. Sul **telefono**: scarica l'app **Expo Go** (App Store / Google Play)
3. Quando l'app sarà pronta, ti darò un **QR code**: lo inquadri e l'app parte sul tuo telefono, in tempo reale. Magia. ✨

---

## 📌 Riepilogo: la tua "cassetta delle chiavi"

Tieni un file/nota sicura con:

| Servizio | Cosa salvare | Fatto? |
|---|---|---|
| Supabase | Password database, Project URL, anon key | ☐ |
| Stripe | (per ora nulla — chiavi test già in dashboard) | ☐ |
| OpenAI | Secret key | ☐ |
| PostHog | Project API key | ☐ |

> ⚠️ **Regola d'oro**: le chiavi che iniziano con `sk_` o si chiamano `service_role` sono SEGRETE. Non incollarle mai in chat, email o nel codice su GitHub. Ti dirò io esattamente dove metterle (campi cifrati di Vercel/Supabase).

---

## 🚦 Prossimo step (lo faccio io)

Appena confermi di aver completato **Passi 2 (Supabase)**, io:
1. creo lo scheletro del monorepo (app web Next.js + app mobile Expo + pacchetto condiviso);
2. costruisco le pagine di login/registrazione collegate a Supabase;
3. ti guido a collegare Vercel per vedere il sito online al tuo primo link `https://workout-companion-ai.vercel.app`.
