# 🗄️ Schema Database Completo
## Workout Companion AI — PostgreSQL su Supabase

---

## 1. Cos'è un database, in 30 secondi

Un database è un insieme di **tabelle**, come fogli Excel collegati tra loro:
- ogni **tabella** rappresenta un tipo di cosa (utenti, esercizi, allenamenti…);
- ogni **riga** è un elemento (l'utente Luca, l'esercizio Squat…);
- ogni **colonna** è un'informazione (nome, peso, data…);
- le **relazioni** collegano le tabelle: "questo allenamento appartiene a quel programma, che appartiene a quel cliente, che è seguito da quel coach".
- le **RLS Policies** (Row Level Security) sono regole di sicurezza dentro il database stesso: "questa riga può essere letta solo dal coach proprietario". Anche se il codice avesse un bug, il database rifiuterebbe l'accesso.

## 2. Mappa delle tabelle (24 tabelle, 7 aree)

```
IDENTITÀ                 ALLENAMENTO                NUTRIZIONE
├─ profiles              ├─ exercises               ├─ nutrition_plans
├─ organizations         ├─ programs                ├─ nutrition_days
├─ organization_members  ├─ program_weeks           ├─ meals
├─ coach_clients         ├─ program_workouts        ├─ foods
└─ client_intake         ├─ workout_exercises       ├─ meal_foods
                         ├─ exercise_sets           └─ food_favorites
PROGRESSI                ├─ workout_logs
├─ checkins              ├─ set_logs                BUSINESS
├─ checkin_photos        └─ personal_records        ├─ subscriptions
└─ body_measurements                                └─ payments
                         COMUNICAZIONE
                         ├─ conversations           AI
                         └─ messages                └─ ai_conversations
```

## 3. Tabelle principali spiegate

### Area Identità
| Tabella | Cosa contiene | Note |
|---|---|---|
| `profiles` | Tutti gli utenti (estende l'auth di Supabase): nome, ruolo (`athlete/coach/gym_owner/admin`), foto, unità di misura | 1 riga per utente, creata automaticamente alla registrazione |
| `organizations` | Palestre/studi: nome, logo, colori brand (per il white label futuro) | Solo B2B |
| `organization_members` | Chi lavora in quale palestra e con che ruolo (`owner/manager/coach`) | Ruoli e permessi B2B |
| `coach_clients` | Il legame coach ↔ cliente: stato (`invited/active/paused/ended`), data inizio | La tabella più importante per la sicurezza: quasi tutte le regole RLS passano da qui |
| `client_intake` | Questionario iniziale: obiettivi, esperienza, infortuni, sport praticati, disponibilità, orari pasti/sonno/allenamento | Come la schermata "Nuovo cliente" degli screenshot |

### Area Allenamento
| Tabella | Cosa contiene |
|---|---|
| `exercises` | Libreria esercizi: nome, categoria, gruppo muscolare, meccanica, attrezzatura, video URL, immagini, note tecniche. Esercizi globali (di sistema) + personalizzati del coach |
| `programs` | Il "contenitore" scheda: nome, obiettivo (forza/ipertrofia/dimagrimento/endurance), cliente assegnato, durata settimane, stato |
| `program_weeks` | Le settimane del programma (per la periodizzazione: settimana 1 = accumulo, 4 = scarico…) |
| `program_workouts` | Le sessioni della settimana (es. "Lunedì — Pull Lower") |
| `workout_exercises` | Gli esercizi dentro una sessione, in ordine, con note coach e metodo (top set, back off, superset) |
| `exercise_sets` | Le serie prescritte: serie, ripetizioni (range), RPE target, recupero, tempo esecuzione |
| `workout_logs` | Un allenamento **eseguito** dal cliente: data, durata, volume totale, note |
| `set_logs` | Ogni serie **eseguita**: carico, reps, RPE reale, note, video del cliente. È la fonte di analytics e PR |
| `personal_records` | PR automatici: massimo carico, massime reps, miglior volume, 1RM stimato per esercizio |

### Area Nutrizione
| Tabella | Cosa contiene |
|---|---|
| `nutrition_plans` | Piano alimentare: cliente, durata, TDEE/BMR calcolati, modalità (manuale/automatica), stato |
| `nutrition_days` | Calorie e macro per ogni giorno della settimana (rotazione calorie ON/OFF come negli screenshot) |
| `meals` | I pasti del giorno (colazione, pranzo…) con orari |
| `foods` | Database alimenti: nome, marca, valori per 100g, barcode (per lo scanner futuro) |
| `meal_foods` | Gli alimenti dentro un pasto, con grammature e possibili sostituzioni |
| `food_favorites` | Alimenti preferiti per utente |

### Area Progressi
| Tabella | Cosa contiene |
|---|---|
| `checkins` | Check-in settimanale: peso, sonno, energia, fame, stress, dolori, aderenza, passi, note |
| `checkin_photos` | Foto (frontale/laterale/posteriore) — salvate in Storage privato, qui solo il riferimento |
| `body_measurements` | Circonferenze: vita, fianchi, braccio, coscia, torace… |

### Area Comunicazione, Business, AI
| Tabella | Cosa contiene |
|---|---|
| `conversations` / `messages` | Chat coach-cliente in tempo reale, con allegati e stato lettura |
| `subscriptions` | Stato abbonamento Stripe per utente/organizzazione: piano, stato, scadenza trial, rinnovo |
| `payments` | Storico incassi (dai webhook Stripe) |
| `ai_conversations` | Cronologia chat con l'AI Coach, con conteggio token (controllo costi) |

## 4. Relazioni chiave

```
profiles (coach) ──< coach_clients >── profiles (atleta)
                                            │
programs ──< program_weeks ──< program_workouts ──< workout_exercises ──< exercise_sets
   │                                                        │
   └── assegnato a coach_clients                            └──< set_logs (eseguito)
                                                                    │
nutrition_plans ──< nutrition_days ──< meals ──< meal_foods >── foods
                                                                    
checkins ──< checkin_photos          organizations ──< organization_members >── profiles
```
(il simbolo `──<` significa "uno a molti": un programma ha molte settimane)

## 5. Indici

Gli indici sono come l'indice analitico di un libro: rendono le ricerche istantanee. Il file SQL crea indici su tutte le chiavi esterne e sulle ricerche frequenti (es. `set_logs` per esercizio+data → grafici progressione; `foods` con ricerca testuale per il food database; `messages` per conversazione+data → chat).

## 6. Sicurezza RLS — le 4 regole d'oro

1. **Ognuno vede se stesso**: `profiles`, `subscriptions` → solo la propria riga.
2. **Il coach vede i propri clienti**: ogni tabella dati-cliente controlla che esista un legame `active` in `coach_clients`.
3. **Il cliente vede solo ciò che gli è assegnato**: programmi, piani nutrizionali, check-in propri.
4. **Le palestre vedono solo il proprio team**: filtro su `organization_members`.

Il file SQL completo con tabelle, indici e policy è in:
**`supabase/migrations/00001_initial_schema.sql`** — lo caricheremo su Supabase con un copia-incolla guidato nella fase di setup.
