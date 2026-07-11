# 🎨 UI/UX — Wireframe Testuali
## Workout Companion AI — Design System + tutte le schermate

---

## 1. Design System — "Executive Control Room" (VINCOLANTE, vedi docs/08-DESIGN-SYSTEM.md)

- **Tema**: solo dark "Control Room" — sfondo Deep Navy `#070D1A`, contenitori dati `#0D1626` con **glassmorphism** (`rgba(16,20,30,.65)` + `backdrop-filter: blur(12px)` + bordo `rgba(255,255,255,.08)`)
- **Palette corporate all-blue**: Electric Blue `#38BDF8` (accenti, trend positivi, CTA) · Avio `#2E6BE0` (barre e grafici) · Celeste `#9CD9FF` (bordi e indicatori secondari) · Bianco puro solo per testi e numeri KPI. Rosso/ambra ammessi SOLO come stati funzionali (distruttivo/avviso)
- **Pseudo-3D**: gradienti Deep→Electric sui CTA, ombre direzionali, KPI card con **glow neon** sul bordo
- **Animazioni 60fps**: rolling counter sui KPI, barre che si sollevano da zero, ingressi translateY+fade con stagger; sempre rispettato `prefers-reduced-motion`
- **Font**: Inter — ExtraBold per titoli e macro-numeri (tabular-nums), pesi leggeri per le diciture secondarie
- **Componenti ricorrenti**: card KPI con delta % (↑ in Electric Blue), badge di stato, tabelle editabili inline su vetro, sidebar sinistra fissa (desktop), tab bar inferiore (mobile)

---

## 2. DESKTOP — Portale Coach

### 2.1 Dashboard
```
┌────────┬──────────────────────────────────────────────────────────────┐
│ LOGO   │  Dashboard                                    🔔  [Avatar ▾] │
│        │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│ 🏠 Dash │ │ Clienti  │ │ Attivi   │ │ A rischio│ │ MRR              │  │
│ 👥 Clie │ │ 32       │ │ 28 ↑2    │ │ 3 ⚠️     │ │ €2.840 ↑5%      │  │
│ 🏋 Alle │ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
│ 🍽 Nutr │ ┌───────────────────────────────┐ ┌─────────────────────┐   │
│ ✅ Chec │ │ 📈 Andamento business (6 mesi)│ │ ⚠️ Clienti a rischio│   │
│ 💬 Mess │ │   [grafico linee revenue]     │ │ • Anna R. (7gg no   │   │
│ 📅 Cale │ │                               │ │   login) [Scrivi]   │   │
│ 💳 Paga │ └───────────────────────────────┘ │ • Marco T. (check-in│   │
│ 📊 Repo │ ┌───────────────────────────────┐ │   saltato) [Vedi]   │   │
│        │ │ Oggi: 6 check-in da rivedere  │ └─────────────────────┘   │
│ ⚙️ 🌙  │ │ 4 allenamenti completati ✓    │                           │
└────────┴──────────────────────────────────────────────────────────────┘
```

### 2.2 Clienti (lista + scheda)
```
Lista:  [🔍 Cerca] [Filtro: Attivi ▾] [+ Nuovo cliente]
┌─────────────────────────────────────────────────────────────┐
│ Foto │ Nome        │ Obiettivo   │ Aderenza │ Ultimo check  │
│ 👤   │ Luca Rossi  │ Massa       │ ████ 92% │ 2gg fa    ✓   │
│ 👤   │ Anna Verdi  │ Definizione │ ██   45% │ 9gg fa    ⚠️  │
└─────────────────────────────────────────────────────────────┘
Scheda cliente (tab): [Panoramica][Anamnesi][Programmi][Nutrizione][Check-in][Chat]
Panoramica: peso attuale + grafico, PR recenti, prossimo allenamento, note
```

### 2.3 Costruttore Allenamenti
```
[Programma: Massa Q3 ▾] [Settimana 1 ▾ ◀ ▶] [Duplica settimana] [Salva]
┌ Lunedì — Pull Lower ────────────────────────────────────────┐
│ 1. Stacco da terra    [Bilanciere] [video ▶]                │
│    Set 1 (Top set):  4-6 reps · RPE 8 · rec 180s            │
│    Set 2-4 (Back off): 6 reps · RPE 8 · rec 150s            │
│    Note coach: [Buon setup, schiena neutra…]                │
│ 2. Lat machine presa larga  3×8-10 · RPE 8  [＋ set]        │
│ [＋ Aggiungi esercizio]  ← apre libreria con ricerca/filtri │
└─────────────────────────────────────────────────────────────┘
Sidebar destra: riepilogo volume settimana per gruppo muscolare
```

### 2.4 Nutrizione (come screenshot "Piano alimentare")
```
[Durata: 12 settimane] [Inizio: data] [Calorie: Manuale/Auto] [Ricalcola]
Grafico a barre: kcal per giorno (blu=allenamento, grigio=riposo, linea TDEE)
Tabella editabile: Giorno | Tipo ON/OFF | Kcal | P | C | G | C:G | Azioni
Riga finale: Media settimanale. Sidebar: riepilogo piano + insight automatici AI
```

### 2.5 Analytics / Check & Progressi (come screenshot "Panca piana")
```
Per esercizio: grafico tonnellaggio nel tempo + media mobile + obiettivo
Analisi rep range con fascia target verde · Adesione al range %
Card "Progressione suggerita" (AI): "Aumenta a 105 kg mantenendo 6-10 reps"
[Applica suggerimento] → modifica la scheda in un click
```

### 2.6 Pagamenti
```
KPI: MRR, abbonamenti attivi, trial in corso, churn
Tabella: Cliente | Piano | Stato | Rinnovo | Importo
[Gestisci il mio abbonamento] → Stripe Customer Portal
```

---

## 3. MOBILE — App Atleta (tab bar: Home · Allenamento · Nutrizione · ＋ · Chat/Profilo)

### 3.1 Home
```
┌──────────────────────────────┐
│ Ciao Luca 👋       [🔔] [👤] │
│ ┌──────────────────────────┐ │
│ │ OGGI · Pull Lower        │ │
│ │ 6 esercizi · ~75 min     │ │
│ │ [▶ INIZIA ALLENAMENTO]   │ │
│ └──────────────────────────┘ │
│ 🍽 Oggi: 3.000 kcal          │
│ P 190g · C 360g · G 85g      │
│ 📈 Peso: 82,4 kg ↓0,3        │
│ ✅ Check-in domenica → 3gg    │
└──────────────────────────────┘
```

### 3.2 Workout Tracker (come screenshot "Pull Lower")
```
┌──────────────────────────────┐
│ ← Pull Lower      ⏱ 00:42:13 │
│ ① Stacco da terra   [▶video] │
│   Ultima: 100kg × 5 (12/5)   │
│   SET  KG    REPS  RPE  ✓    │
│   1    [100] [5]  [8]  [✓]  │
│   2    [90 ] [6]  [8]  [ ]  │
│   ⏲ RECUPERO 02:34 [salta]  │
│   [＋ aggiungi set] [note 📝]│
│ ② Lat machine …  ▾           │
│ [✔ COMPLETA ALLENAMENTO]     │
└──────────────────────────────┘
Salvataggio automatico ad ogni campo · timer parte da solo a serie completata
```

### 3.3 Nutrizione (giorno)
```
Anello progresso kcal: 1.840 / 3.000
Barre macro: P 120/190 · C 210/360 · G 55/85
Pasti: Colazione ✓ · Pranzo ✓ · Snack ○ · Cena ○
→ dettaglio pasto: alimenti+grammi, [sostituisci 🔄] da lista sostituzioni
[🔍 cerca alimento] [⭐ preferiti] [barcode 📷 (v2)]
```

### 3.4 Check-in settimanale (come screenshot "Riepilogo settimanale")
```
Striscia giorni LUN-DOM con spunte verdi
Card panoramica: sonno, stress, kcal medie, passi (+delta %)
Slider 1-10: energia, fame, dolori, recupero…
Foto richieste: frontale/laterale/posteriore [Aggiungi foto]
Note (0/500) → [INVIA RIEPILOGO SETTIMANALE]
```

### 3.5 Chat & Profilo
```
Chat: stile WhatsApp, allegati foto/video, badge non letti
Profilo: statistiche (allenamenti totali, PR, streak), obiettivi,
unità di misura, notifiche, abbonamento, logout
```

### 3.6 AI Coach (v1.0)
```
Chat dedicata "💡 AI Coach": domande su piano/sostituzioni/progressi
Risposte basate SOLO sui dati e sul piano del cliente
Bottone contestuale ovunque: "Chiedi all'AI" (es. su un grafico)
```
