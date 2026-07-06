# 🖥️ Portale Web Coach — Next.js

Il portale per coach e palestre: dashboard, clienti, programmi, nutrizione, check-in, chat e pagamenti.

## Avvio in locale (per chi inizia)

```bash
# 1. Dalla cartella workout-companion-ai/ installa tutto (una volta sola)
npm install

# 2. Crea il file dei segreti (copia l'esempio e compila i valori)
cp apps/web/.env.example apps/web/.env.local

# 3. Avvia il sito in locale
npm run dev:web
# → apri http://localhost:3000 nel browser
```

## Deploy su Vercel (quando sei pronto)

1. vercel.com → **Add New → Project** → importa il repository GitHub
2. **Root Directory**: `workout-companion-ai/apps/web`
3. In **Environment Variables** incolla le stesse variabili di `.env.example` (con i valori veri)
4. **Deploy** → il sito è online. Da qui in poi ogni push su `main` pubblica da solo.

## Struttura

- `app/(auth)/` — login e registrazione
- `app/(dashboard)/` — l'area riservata del coach
- `app/api/stripe/` — checkout, portale clienti e webhook pagamenti
- `components/` — pezzi di interfaccia riutilizzabili
- `lib/` — connessioni a Supabase e Stripe
