# 🏗️ Architettura del Sistema
## Workout Companion AI — spiegata per principianti assoluti

---

## 1. La metafora del ristorante 🍝

Immagina la piattaforma come un ristorante:

- **Frontend web (Next.js)** = la sala del ristorante per i coach: bella, curata, dove si "consuma" il servizio dal computer.
- **App mobile (Expo)** = il servizio d'asporto per gli atleti: stessa cucina, esperienza da telefono.
- **Backend (Supabase)** = la cucina: dove i dati vengono preparati, salvati e protetti.
- **Database (PostgreSQL)** = la dispensa: dove tutto è conservato in modo ordinato.
- **Stripe** = la cassa: gestisce pagamenti e abbonamenti.
- **OpenAI** = il consulente esperto che la cucina chiama quando serve un parere intelligente.
- **Vercel** = il locale in affitto dove la "sala" è ospitata, sempre aperto, in tutto il mondo.
- **GitHub** = il ricettario con lo storico di ogni modifica: se sbagli una ricetta, torni alla versione precedente.

## 2. Schema generale

```
                        ┌─────────────────────────┐
                        │        UTENTI           │
                        └─────────────────────────┘
                          │                    │
              ┌───────────▼──────────┐  ┌──────▼───────────────┐
              │  PORTALE WEB (Coach) │  │  APP MOBILE (Atleta) │
              │  Next.js su Vercel   │  │  React Native Expo   │
              └───────────┬──────────┘  └──────┬───────────────┘
                          │                    │
                          └─────────┬──────────┘
                                    │  (HTTPS, chiavi sicure)
                     ┌──────────────▼───────────────┐
                     │           SUPABASE           │
                     │  ┌────────────────────────┐  │
                     │  │ Auth (login, ruoli)    │  │
                     │  │ PostgreSQL (dati)      │  │
                     │  │ Storage (foto, video)  │  │
                     │  │ Realtime (chat live)   │  │
                     │  │ Edge Functions (logica)│──┼──► OpenAI API (AI Coach)
                     │  └────────────────────────┘  │──► Stripe (webhook pagamenti)
                     └──────────────────────────────┘
                                    │
                          ┌─────────▼─────────┐
                          │      PostHog      │  (analytics: cosa usano gli utenti)
                          └───────────────────┘
```

## 3. Gli strumenti, uno per uno (mini-guide)

### 3.1 GitHub — l'archivio del codice
- **Cosa fa**: conserva il codice online con la cronologia completa di ogni modifica (come "Cronologia versioni" di Google Docs, ma per il codice).
- **Perché serve**: backup, collaborazione, e Vercel lo legge per pubblicare il sito automaticamente.
- **Costo**: **gratis** per il nostro uso (repository privati inclusi).
- **Account**: vai su https://github.com → "Sign up" → email + password → verifica email. Fatto.
- **Come si usa (per te)**: quasi tutto avverrà in automatico. Tu vedrai il codice su github.com nel tuo repository. Concetti chiave: *repository* = cartella del progetto; *commit* = fotografia salvata delle modifiche; *branch* = copia parallela su cui lavorare senza rompere l'originale.

### 3.2 Vercel — dove vive il sito
- **Cosa fa**: prende il codice da GitHub e lo trasforma in un sito online raggiungibile da chiunque, in pochi secondi ad ogni modifica.
- **Perché serve**: senza Vercel il sito esisterebbe solo sul tuo computer. È creato dagli stessi autori di Next.js: integrazione perfetta.
- **Costo**: piano **Hobby gratis** (perfetto per iniziare); piano Pro 20$/mese quando avrai traffico reale.
- **Account**: https://vercel.com → "Sign up" → **scegli "Continue with GitHub"** (così si collegano da soli).
- **Come si usa**: colleghi il repository GitHub una volta sola; ogni volta che il codice viene aggiornato, Vercel pubblica la nuova versione da solo. Zero manutenzione.

### 3.3 Supabase — backend e database
- **Cosa fa**: è 4 servizi in uno — database PostgreSQL, login utenti (Auth), archivio file (Storage), e piccole funzioni server (Edge Functions).
- **Perché serve**: ci evita di costruire e mantenere un server nostro. La sua "Row Level Security" protegge i dati direttamente nel database: un coach non può fisicamente leggere i clienti di un altro coach.
- **Costo**: piano **gratis** (500MB database, 1GB storage — sufficiente per l'MVP); piano Pro 25$/mese quando servirà.
- **Account**: https://supabase.com → "Start your project" → accedi **con GitHub** → "New project" → scegli nome, password del database (salvala!) e regione **Europe (Frankfurt)** per il GDPR.
- **Come si usa**: dalla dashboard web vedi le tabelle come fogli Excel; il codice le userà tramite chiavi API che copieremo insieme al momento giusto.

### 3.4 Stripe — i pagamenti
- **Cosa fa**: gestisce carte di credito, abbonamenti mensili/annuali, prove gratuite, fatture. È usato da Amazon, Shopify, Booking.
- **Perché serve**: gestire carte in proprio è illegale senza certificazioni costosissime. Stripe si prende questa responsabilità.
- **Costo**: **zero canone** — trattiene ~1,5% + 0,25€ per transazione europea (2,9% extra-UE). Paghi solo se incassi.
- **Account**: https://stripe.com → "Start now" → email + dati. All'inizio userai la **modalità Test** (carte finte, zero rischi); i dati aziendali reali serviranno solo prima di incassare davvero.
- **Come si usa**: definiremo i piani (Coach Pro 69€/mese, ecc.) nella dashboard Stripe; il sito mostrerà il checkout di Stripe già pronto; un "webhook" avviserà Supabase quando qualcuno paga o disdice.

### 3.5 OpenAI API — il cervello dell'AI Coach
- **Cosa fa**: dà accesso ai modelli AI (tipo ChatGPT) via codice, per generare risposte, report e suggerimenti.
- **Perché serve**: alimenta l'AI Coach (analisi progressi, suggerimenti scheda, risposte al cliente).
- **Costo**: a consumo — per l'MVP parliamo di **5-20$/mese**. Si imposta un tetto massimo di spesa per sicurezza.
- **Account**: https://platform.openai.com → Sign up → sezione "API keys" → crea chiave (la incolleremo SOLO in Supabase, mai nell'app: così nessuno può rubarla).
- **Come si usa**: l'app chiama una Edge Function su Supabase, che aggiunge i dati del cliente (scheda, progressi) e interroga OpenAI, restituendo la risposta.

### 3.6 PostHog — capire come viene usata l'app
- **Cosa fa**: registra in forma anonima cosa fanno gli utenti (quali schermate aprono, dove abbandonano).
- **Perché serve**: per decidere cosa migliorare con dati reali, non a sensazione. Fondamentale per una startup.
- **Costo**: **gratis** fino a 1 milione di eventi/mese (per noi è tantissimo).
- **Account**: https://posthog.com → Sign up → scegli "EU Cloud" (GDPR) → copia la chiave del progetto.
- **Come si usa**: si aggiunge una riga di configurazione all'app; poi guardi grafici e funnel dalla loro dashboard.

### 3.7 Expo — l'app mobile senza mal di testa
- **Cosa fa**: permette di scrivere UNA sola app in React Native e pubblicarla sia su iPhone che Android; con l'app "Expo Go" la testi sul tuo telefono in tempo reale.
- **Perché serve**: sviluppare due app native separate (Swift + Kotlin) costerebbe il doppio.
- **Costo**: gratis per sviluppo; ti serviranno poi Apple Developer (99$/anno) e Google Play (25$ una tantum) SOLO al momento della pubblicazione negli store.
- **Account**: https://expo.dev → Sign up. E scarica "Expo Go" dall'App Store/Play Store sul tuo telefono.

## 4. Decisioni architetturali chiave

| Decisione | Scelta | Perché |
|---|---|---|
| Struttura codice | **Monorepo** (web + mobile + condiviso in un solo repository) | Tipi e logica condivisi, un solo posto da guardare |
| Logica di business sensibile | **Edge Functions** (mai nel client) | Chiavi OpenAI/Stripe al sicuro sul server |
| Sicurezza dati | **RLS su ogni tabella** | Isolamento coach/clienti garantito dal database, non dal codice |
| Chat coach-cliente | **Supabase Realtime** | Messaggi live senza servizi extra |
| Foto check-in & video esercizi | **Supabase Storage** (bucket privati + URL firmati) | Le foto dei clienti sono dati sensibili |
| Pagamenti | **Stripe Checkout + Customer Portal** | Zero UI di pagamento da costruire, PCI compliance inclusa |
| Stato abbonamento | Webhook Stripe → tabella `subscriptions` | Il database è sempre la fonte di verità |

## 5. Costi totali stimati

| Fase | Costo mensile |
|---|---|
| Sviluppo MVP (tutto in piano free/test) | **~0-20€** (solo OpenAI) |
| Lancio (primi 100 utenti) | ~50-70€ (Supabase Pro + Vercel Pro + OpenAI) |
| Pubblicazione app store | 99$/anno Apple + 25$ una tantum Google |
