# 📁 Struttura Repository GitHub
## Workout Companion AI — Monorepo

---

## 1. Cos'è un "monorepo" e perché lo usiamo

Un **monorepo** è un unico repository GitHub che contiene tutti i pezzi del progetto (sito web, app mobile, database, codice condiviso). L'alternativa sarebbe avere 3-4 repository separati.

**Perché per noi il monorepo è meglio:**
- I "tipi" dei dati (com'è fatto un allenamento, un check-in…) sono definiti UNA volta e usati sia dal web che dal mobile → zero incoerenze.
- Una sola cosa da tenere d'occhio, un solo storico modifiche.
- Le aziende come Google e Vercel lavorano così.

## 2. Struttura delle cartelle

```
workout-companion-ai/
│
├── docs/                          # 📚 Tutta la documentazione (questa!)
│   ├── 01-PRD.md
│   ├── 02-ARCHITETTURA.md
│   ├── 03-DATABASE-SCHEMA.md
│   ├── 04-STRUTTURA-REPOSITORY.md
│   ├── 05-ROADMAP.md
│   ├── 06-SETUP-GUIDA-PRINCIPIANTI.md
│   └── 07-UI-UX-WIREFRAMES.md
│
├── apps/
│   ├── web/                       # 🖥️ Portale coach (Next.js → Vercel)
│   │   ├── app/                   #    Le pagine del sito
│   │   │   ├── (auth)/            #    Login, registrazione, recupero password
│   │   │   ├── (dashboard)/       #    Area coach: dashboard, clienti, programmi,
│   │   │   │                      #    nutrizione, check-in, chat, analytics, pagamenti
│   │   │   └── api/               #    Endpoint server (es. webhook Stripe)
│   │   ├── components/            #    Pezzi di interfaccia riutilizzabili (bottoni, card, grafici)
│   │   ├── lib/                   #    Funzioni di supporto (connessione Supabase, Stripe…)
│   │   └── package.json           #    Lista "ingredienti" (librerie) dell'app web
│   │
│   └── mobile/                    # 📱 App atleta (React Native + Expo)
│       ├── app/                   #    Le schermate: Home, Workout, Nutrizione, Chat, Profilo
│       ├── components/            #    Pezzi di interfaccia mobile
│       ├── lib/                   #    Connessione a Supabase, notifiche…
│       └── package.json
│
├── packages/
│   └── shared/                    # 🔄 Codice condiviso tra web e mobile
│       ├── types/                 #    Definizioni dati (Profilo, Programma, CheckIn…)
│       ├── calculations/          #    Formule: TDEE, BMR, 1RM stimato, volume
│       └── constants/             #    Liste: gruppi muscolari, categorie, piani prezzo
│
├── supabase/                      # 🗄️ Tutto ciò che riguarda il backend
│   ├── migrations/                #    Le "ricette" per costruire il database, in ordine
│   │   └── 00001_initial_schema.sql
│   ├── functions/                 #    Edge Functions (AI coach, webhook Stripe…)
│   └── seed/                      #    Dati iniziali: libreria esercizi, alimenti base
│
├── .github/
│   └── workflows/                 # 🤖 Automazioni (controlli qualità ad ogni modifica)
│
├── README.md                      # La "copertina" del progetto
├── package.json                   # Configurazione generale del monorepo
└── turbo.json                     # Turborepo: fa lavorare insieme le app del monorepo
```

## 3. Le regole del gioco (workflow Git)

Per chi non ha mai usato Git, funzionerà così (e sarò io a farlo per te, spiegandotelo ogni volta):

1. **branch `main`** = la versione "ufficiale" e sempre funzionante. Vercel pubblica online quello che c'è qui.
2. **branch di lavoro** (es. `feature/workout-tracker`) = copia parallela dove sviluppiamo una funzionalità senza rischi.
3. **Pull Request (PR)** = la richiesta di "fondere" il lavoro finito dentro `main`, con revisione prima di procedere.
4. **commit** = ogni salvataggio con una descrizione ("Aggiunto timer di recupero al tracker").

## 4. Convenzioni

- **Nomi file/cartelle**: inglese, minuscolo, trattini (`workout-tracker.tsx`).
- **Commit**: descrizione chiara in inglese, prefissi `feat:` (novità), `fix:` (correzione), `docs:` (documentazione).
- **Segreti (chiavi API)**: MAI dentro il repository. Vivono in file `.env.local` (ignorati da Git) e nelle impostazioni di Vercel/Supabase. Il file `.env.example` mostra QUALI chiavi servono, senza i valori veri.
