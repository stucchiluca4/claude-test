# Supabase — backend di Workout Companion AI

## Cosa c'è qui

| Cartella | Contenuto |
|---|---|
| `migrations/` | Le "ricette" SQL che costruiscono il database, in ordine numerico |
| `seed/` | Dati iniziali: 150 esercizi + 130 alimenti (facoltativi ma consigliati) |
| `functions/` | Edge Functions: codice che gira sui server di Supabase |

## Setup (una volta sola, ~10 minuti)

1. **Crea il database**: Supabase → SQL Editor → New query → incolla `migrations/00001_initial_schema.sql` → Run.
2. **Carica gli esercizi**: nuova query → incolla `seed/00001_exercises.sql` → Run.
3. **Carica gli alimenti**: nuova query → incolla `seed/00002_foods.sql` → Run.

Se vedi "Success" dopo ogni Run, è tutto a posto. ✅

## Edge Functions (per la fase AI Coach)

La funzione `ai-coach` risponde alle domande degli utenti usando OpenAI,
leggendo i dati del cliente nel rispetto della sicurezza RLS.

Si pubblica con la CLI di Supabase (ti guiderò quando arriva il momento):

```bash
supabase functions deploy ai-coach
supabase secrets set OPENAI_API_KEY=sk-...
```
