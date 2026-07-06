# Workout Companion AI — App mobile (atleta)

App React Native (Expo) per gli atleti della piattaforma Workout Companion AI:
allenamenti del giorno con tracker serie-per-serie, piano nutrizionale, check-in
settimanale e chat con il proprio coach.

## Stack

- Expo SDK 51 + expo-router (routing basato sui file in `app/`)
- TypeScript strict
- Supabase (`@supabase/supabase-js`) con sessione persistita in AsyncStorage
- Codice condiviso con il resto del monorepo tramite `@wc/shared`

## Configurazione

1. Copia `.env.example` in `.env` (in questa cartella `apps/mobile/`).
2. Inserisci i valori del tuo progetto Supabase (dashboard → Project Settings → API):
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Avvio con Expo Go

Dalla **radice del repo**:

```bash
npm install          # installa tutte le workspace
npm run dev:mobile   # avvia il dev server di Expo
```

Poi scansiona il QR code mostrato nel terminale con l'app **Expo Go**
(Android: dall'app stessa; iOS: con la fotocamera). Telefono e computer devono
essere sulla stessa rete Wi-Fi.

Comandi utili (da `apps/mobile/`):

```bash
npm run start        # dev server
npm run android      # apre su emulatore/dispositivo Android
npm run ios          # apre su simulatore iOS
npm run typecheck    # controllo TypeScript
```
