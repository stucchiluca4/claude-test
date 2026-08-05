# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

Due superfici di un unico prodotto: app **atleta** nativa (Expo / React Native, iOS + Android) e portale **coach** web (Next.js). Il redesign copre entrambe con lo stesso linguaggio materiale.

## Users

**Atleta (app mobile)** — utente primario del prodotto. Lo usa **in palestra, tra una serie e l'altra**: telefono in mano, spesso sudata, attenzione frammentata, sguardo di 3 secondi tra un set e il successivo. Deve registrare carichi e ripetizioni, vedere cosa fare adesso, far partire un timer di recupero e chiudere la seduta senza pensarci.

**Coach / personal trainer (portale web)** — costruisce schede multi-settimana e piani alimentari, segue più clienti insieme, valuta check-in settimanali, risponde in chat, gestisce listino e abbonamento. Lavora seduto, su schermo grande, con sessioni lunghe e molti dati a confronto.

## Product Purpose

Una piattaforma unica che tiene insieme allenamento, nutrizione, check-in, chat e assistenza AI: il coach programma e monitora da web, l'atleta esegue e registra da telefono, e i dati tornano al coach senza passaggi manuali. Successo = l'atleta registra la seduta senza attrito e il coach vede cosa sta succedendo ai suoi clienti senza chiederlo.

## Positioning

Prodotto **destinato alla vendita ad altri coach**: deve reggere il confronto diretto con Trainerize, WHOOP e Strava. Il differenziale non è la lista di funzioni ma la catena chiusa **prescrizione → esecuzione → feedback per esercizio → analisi → aggiustamento**, con un motore che trasforma i dati in azioni concrete (prontezza del giorno, suggerimento di carico per esercizio, insight sul sovraccarico) invece che in soli grafici.

## Operating Context

- **Scena atleta:** sala pesi, luce artificiale spesso bassa o irregolare, telefono tenuto con una mano, guanti o mani umide, rumore e distrazione. L'app viene aperta decine di volte in una sessione per pochi secondi ciascuna.
- **Scena coach:** scrivania, sessioni lunghe di programmazione, confronto tra settimane e tra clienti.
- Rituali ricorrenti: check biofeedback giornaliero, check-in settimanale con foto e misure, chat con il coach, timer di recupero tra le serie.

## Capabilities and Constraints

**Funzionalità confermate (nessuna può essere persa o semplificata via nel redesign):** feedback per esercizio (RPE, difficoltà, energia, dolore, note); completamento allenamento con riepilogo (punteggio, record personali, calorie, previsione recupero, recap AI); timer avanzati (countdown, cronometro, EMOM, AMRAP, isometria) con suono, vibrazione e passaggio automatico; coach AI contestuale per esercizio; dashboard progressi (KPI, volume, attività, progressione forza, record); motore insight data-driven; prontezza del giorno e suggerimento di carico; allegati foto/video per esercizio; integrazioni salute (12 provider + inserimento manuale); modalità demo senza account; portale coach completo (clienti, programmi, nutrizione, check-in, messaggi, listino, abbonamenti, impostazioni).

**Vincoli tecnici:** monorepo npm workspaces; Expo SDK 57 / React Native 0.86 con expo-router; Next.js 16 App Router con Tailwind; Supabase con Row Level Security come unico confine di sicurezza; token e formule condivisi in `packages/shared`; migrazioni SQL applicate a mano; l'app mobile deve restare eseguibile in Expo Go (nessuna dipendenza fuori dall'SDK Expo).

**Terminologia:** italiano in tutta l'interfaccia. Serie, ripetizioni, RPE, carico, volume, tonnellaggio, scarico, 1RM stimato, biofeedback, check-in.

## Brand Commitments

- Nome prodotto: **Workout Companion AI**.
- Interfaccia in italiano, tono diretto e da coach competente (mai gergo motivazionale gonfiato).
- Vincolo visivo posto esplicitamente dall'utente e vincolante per il redesign: linguaggio **Apple "Liquid Glass"** — materiali traslucidi stratificati, geometria concentrica, motion fluido.
- Nessun vincolo di palette: il blu esistente può evolvere.

## Evidence on Hand

Piattaforma reale e funzionante, non un mockup: database Supabase con 30+ tabelle e policy di sicurezza, entrambe le app in esecuzione in locale, 10 funzioni sviluppate e verificate, codice su GitHub (`stucchiluca4/claude-test`, branch `claude/workout-companion-ai-4j9xa8`).

**Assenze da non inventare:** nessun cliente reale, nessuna testimonianza, nessun dato di utilizzo aggregato, nessun benchmark. Stripe non è configurato (i prezzi 29/69/129 € sono definiti nel codice ma non attivi). La edge function AI è scritta ma non ancora deployata.

## Product Principles

1. **Tre secondi in palestra.** Ogni schermata dell'atleta deve rispondere a "cosa faccio adesso" in un colpo d'occhio, con le mani occupate.
2. **Un'informazione domina, il resto sostiene.** Mai due elementi che competono per la stessa attenzione nella stessa schermata.
3. **I dati diventano azioni.** Un numero senza una conseguenza pratica è decorazione: ogni metrica porta a un consiglio o a un gesto.
4. **Nessuna funzione persa per estetica.** La bellezza non toglie nulla a ciò che l'app sa già fare.
5. **Il coach vede senza chiedere.** Quello che l'atleta registra arriva al coach già interpretato.

## Accessibility & Inclusion

Uso a una mano con schermo grande: aree tattili generose (minimo 44×44 pt) e comandi principali raggiungibili col pollice. Contrasto del testo su contenuto conforme a WCAG AA in condizioni di luce sfavorevole. Il movimento deve rispettare la preferenza di riduzione del movimento del sistema. L'informazione non è mai affidata al solo colore.
