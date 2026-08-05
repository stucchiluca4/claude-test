---
name: Workout Companion AI
description: Vetro sul ferro — il livello dei controlli galleggia in vetro liquido, il contenuto resta solido e leggibile a mani sudate.
colors:
  iron-void: "#06080D"
  iron-ground: "#0C1017"
  iron-surface: "#151A24"
  iron-raised: "#1E2531"
  iron-line: "#2A3241"
  glass-tint: "rgba(22, 28, 38, 0.62)"
  glass-edge: "rgba(255, 255, 255, 0.30)"
  glass-border: "rgba(255, 255, 255, 0.08)"
  signal-blue: "#0A84FF"
  signal-mint: "#32D74B"
  signal-amber: "#FF9F0A"
  signal-rose: "#FF375F"
  signal-violet: "#BF5AF2"
  signal-cyan: "#64D2FF"
  text-primary: "#FFFFFF"
  text-secondary: "#9BA6B8"
  text-tertiary: "#6B7688"
typography:
  metric:
    fontFamily: "SF Pro Rounded, ui-rounded, -apple-system, system-ui, sans-serif"
    fontSize: "64px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  display:
    fontFamily: "SF Pro Display, -apple-system, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "SF Pro Display, -apple-system, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "SF Pro Text, -apple-system, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.45
  callout:
    fontFamily: "SF Pro Text, -apple-system, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.35
  label:
    fontFamily: "SF Pro Text, -apple-system, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.06em"
rounded:
  xs: "10px"
  sm: "14px"
  md: "18px"
  lg: "26px"
  xl: "34px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "28px"
  xxxl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.text-primary}"
    typography: "{typography.callout}"
    rounded: "{rounded.pill}"
    padding: "16px 28px"
    height: "56px"
  button-glass:
    backgroundColor: "{colors.glass-tint}"
    textColor: "{colors.text-primary}"
    typography: "{typography.callout}"
    rounded: "{rounded.pill}"
    padding: "14px 24px"
    height: "52px"
  card-iron:
    backgroundColor: "{colors.iron-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input-field:
    backgroundColor: "{colors.iron-raised}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "14px 16px"
    height: "52px"
  metric-block:
    backgroundColor: "{colors.iron-surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.metric}"
    rounded: "{rounded.lg}"
    padding: "20px"
  tabbar-glass:
    backgroundColor: "{colors.glass-tint}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.xl}"
    padding: "10px 12px"
---

# Design System: Workout Companion AI

## Overview

**Creative North Star: "Glass Over Iron"**

Due materiali, mai mescolati. Il **ferro** è il contenuto: superfici opache e dense dove vivono i numeri, i carichi, le ripetizioni, i grafici — tutto ciò che un atleta deve leggere in tre secondi con le mani sudate e la testa altrove. Il **vetro** è il controllo: la barra delle schede, le testate, i fogli, il timer di recupero, le barre d'azione. Galleggia sopra il contenuto, lascia intravedere ciò che scorre sotto, prende luce sui bordi e si muove come un liquido pesante.

Questa separazione non è un vezzo: è la ragione per cui il sistema regge in palestra. Il vetro traslucido è splendido e infido — sotto un paragrafo di testo diventa una macchia illeggibile. Mettendolo solo dove ci sono comandi (bersagli grandi, icone, una parola) si ottiene la profondità di Apple senza pagarla in leggibilità. Il contenuto non è mai velato.

L'anti-riferimento è il sistema che questo sostituisce e tutta la sua famiglia: il pannello smerigliato uniforme con bordo bianco all'8%, il bagliore neon attorno a ogni card, il gradiente blu-elettrico su ogni bottone. Era glassmorphism del 2021 — decorazione applicata ovunque, senza gerarchia. Liquid Glass è l'opposto: un materiale con un ruolo preciso, usato con parsimonia, che si comporta come materia fisica.

**Key Characteristics:**
- Vetro solo sul livello dei controlli; il contenuto è sempre opaco
- Un solo numero domina ogni schermata, alla scala del gesto
- Palette a più segnali: ogni colore significa una cosa sola, riconoscibile a colpo d'occhio
- Geometria concentrica: gli angoli interni condividono il centro con quelli esterni
- Movimento a molla, mai lineare; ogni pressione ha una risposta aptica
- Cifre tabulari ovunque: i numeri non ballano mai mentre cambiano

## Colors

Ferro freddo e blu-grafite per la materia, sei segnali ad alta croma per il significato. La saturazione è concentrata nei dati, non nelle superfici.

### Primary
- **Blu Segnale** (#0A84FF): l'azione. Bottone primario, stato attivo, elemento selezionato, identità del prodotto. È l'unico blu che compare: nessun gradiente blu-su-blu, nessuna variante decorativa.

### Secondary
- **Menta Compiuta** (#32D74B): ciò che è fatto. Serie completata, allenamento chiuso, obiettivo raggiunto, conferma di salvataggio.
- **Ambra Sforzo** (#FF9F0A): l'intensità e l'attenzione. RPE alto, carico che sale, avvisi non distruttivi, recupero da rispettare.
- **Rosa Record** (#FF375F): il picco. Record personali, massimali, momenti da celebrare, e le sole azioni distruttive.

### Tertiary
- **Viola Intelligenza** (#BF5AF2): tutto ciò che pensa. Coach AI, insight generati, recap automatici. Un colore riservato: se è viola, l'ha prodotto il motore.
- **Ciano Recupero** (#64D2FF): metriche di stato del corpo. Sonno, recupero, biofeedback, dati dai dispositivi di salute.

### Neutral
- **Vuoto** (#06080D): il nero-blu dietro ogni cosa, dove il vetro trova il suo contrasto.
- **Terra** (#0C1017): il fondo dell'app.
- **Superficie** (#151A24): le card di contenuto, opache.
- **Rilievo** (#1E2531): campi di input, righe selezionabili, superfici sopra le card.
- **Linea** (#2A3241): divisori e bordi del livello ferro.
- **Bianco** (#FFFFFF): numeri e testo primario, sempre pieno, mai al 90%.
- **Nebbia** (#9BA6B8): testo secondario (contrasto 7.8:1 sul fondo).
- **Fumo** (#6B7688): etichette e testo disattivato; mai sotto i 15px né su fondo vetro.

### Named Rules
**La Regola del Significato Unico.** Ogni segnale ha un solo mestiere in tutto il prodotto: blu = azione, menta = fatto, ambra = sforzo, rosa = record, viola = AI, ciano = corpo. Un colore usato per decorazione perde il suo mestiere e va rimosso.

**La Regola del Ferro Opaco.** Nessun testo lungo, numero o grafico poggia su una superficie traslucida. Se ci sta sopra qualcosa da leggere, la superficie è opaca.

## Typography

**Display Font:** SF Pro Display (fallback: -apple-system, system-ui, sans-serif)
**Body Font:** SF Pro Text (fallback: -apple-system, system-ui, sans-serif)
**Metric Font:** SF Pro Rounded (fallback: ui-rounded, -apple-system, system-ui)

**Character:** Il carattere di sistema Apple, usato come lo usa Apple: nessun font caricato, nessuna personalità presa in prestito. La voce del prodotto è nella scala e nel peso, non nel disegno delle lettere. I numeri sono l'eccezione: passano al taglio arrotondato, che è il modo in cui Apple parla di corpo e movimento.

### Hierarchy
- **Metric** (800, 64px, line-height 1, tabulari): il numero che domina la schermata — timer di recupero, volume della seduta, punteggio, peso. Uno solo per schermata.
- **Display** (800, 34px, tracking -0.02em): titolo di schermata. Compare una volta, in alto, e poi sparisce nello scorrimento.
- **Title** (700, 22px): titolo di card o sezione, e nome dell'esercizio nel tracker.
- **Body** (500, 17px, line-height 1.45): testo corrente. Diciassette punti è il minimo per una lettura a braccio teso in palestra: non si scende.
- **Callout** (600, 15px): testo dei controlli, etichette di bottone, valori secondari.
- **Label** (700, 12px, tracking 0.06em, maiuscoletto): intestazioni di sezione e unità di misura. Mai per informazioni che servono davvero.

### Named Rules
**La Regola delle Cifre Ferme.** Ogni numero che cambia nel tempo — timer, contatori, carichi, volume — usa cifre tabulari. Un numero che salta di larghezza mentre scorre è un errore, non un dettaglio.

**La Regola dei Diciassette Punti.** Il corpo del testo non scende mai sotto 17px sul mobile. Se una schermata non ci sta, è la schermata a contenere troppo, non il testo a essere troppo grande.

## Layout

Colonna singola sul mobile, margini laterali di 20px, ritmo verticale su una scala di 4 (4, 8, 12, 16, 20, 28, 40). Sopra un'intestazione c'è sempre più spazio che sotto.

Ogni schermata dell'atleta è costruita attorno a **una cosa dominante** e a un supporto: l'elemento primario occupa la parte alta ed è dimensionato per essere letto in tre secondi, il resto scorre sotto in card di ferro. Il livello vetro non partecipa allo scorrimento: resta ancorato in alto (testata) e in basso (barra schede, barre d'azione, timer).

Sul portale coach la struttura è a due colonne: rail di navigazione in vetro larga 240px ancorata a sinistra, contenuto su griglia fluida con larghezza massima 1280px e margini di 24px. Sotto i 1024px la rail si ritrae in una barra in vetro ancorata in basso, con le stesse regole del mobile. Le tabelle dense diventano liste di card sotto i 768px.

Le aree tattili non scendono mai sotto 44×44pt, e i comandi che si usano durante l'allenamento stanno nella metà bassa dello schermo, raggiungibili col pollice.

## Elevation & Depth

Il sistema ha tre livelli e non ne ammette altri. La profondità nasce dalla **stratificazione dei materiali**, non dall'accumulo di ombre.

- **Livello 0 — Ferro.** Contenuto opaco. Nessuna ombra: si stacca dal fondo per tono (#151A24 su #0C1017) e per una sottile luce sul bordo superiore.
- **Livello 1 — Vetro.** Il livello dei controlli. Sfocatura 30px con saturazione al 180%, tinta scura al 62%, luce speculare sul bordo alto, bordo capello bianco all'8%, e un'ombra portata che stacca il vetro dal contenuto che ci scorre sotto. È l'unico livello che si sfoca.
- **Livello 2 — Faro.** Il singolo elemento a fuoco: serie in corso, timer che scorre, record appena battuto. Riceve un alone del proprio colore segnale. **Uno solo per schermata**: se ce ne sono due, nessuno dei due è a fuoco.

### Shadow Vocabulary
- **lift-glass** (`0 8px 32px rgba(0,0,0,0.45)`): stacca il vetro dal contenuto sottostante.
- **lift-sheet** (`0 -12px 48px rgba(0,0,0,0.60)`): fogli che salgono dal basso.
- **beacon** (`0 0 0 1px <segnale>/35, 0 12px 36px -12px <segnale>/45`): l'unico elemento a fuoco.
- **inner-specular** (`inset 0 1px 0 rgba(255,255,255,0.28)`): la luce che il vetro raccoglie sul bordo alto. Su ferro scende a 0.05.

### Named Rules
**La Regola del Faro Unico.** Un solo elemento per schermata può brillare. L'alone colorato è un puntatore, non una decorazione: moltiplicarlo lo annulla.

**La Regola del Vetro Sospeso.** Il vetro sfoca solo ciò che gli scorre sotto. Un pannello in vetro appoggiato su fondo fisso non è vetro, è una tinta: usa il ferro.

## Shapes

Raggi generosi e **concentrici**: quando una forma ne contiene un'altra, il raggio interno vale il raggio esterno meno la spaziatura, così le curve restano parallele invece di accavallarsi. Una card a raggio 26 con 16 di padding contiene elementi a raggio 10.

Scala: 10 (elementi interni), 14 (campi, chip), 18 (bottoni squadrati, riquadri), 26 (card), 34 (fogli e barre in vetro), pillola (comandi sul livello vetro).

I controlli sul vetro sono **pillole**: la forma capsula è il modo in cui Apple segnala "questo è un comando che galleggia". I contenitori di contenuto non sono mai pillole. I bordi sono capelli da 1px, mai da 2px, e non esistono contorni tratteggiati se non per le zone di caricamento file.

## Components

### Buttons
- **Shape:** pillola piena (999px) per ogni azione; altezza 56px per la primaria, 52px per le secondarie.
- **Primary:** fondo Blu Segnale pieno (#0A84FF), testo bianco, padding 16×28. Alla pressione scende a scala 0.97 con molla e restituisce un colpo aptico leggero.
- **Glass:** vetro con bordo capello e luce speculare, testo bianco. Vive solo sul livello vetro (barre d'azione, testate, fogli).
- **Destructive:** Rosa Record (#FF375F) pieno, riservato a eliminazioni e uscita dall'account.
- **Ghost:** solo testo Blu Segnale, senza fondo, per le azioni terziarie.

### Cards / Containers
- **Corner Style:** 26px, concentrico verso l'interno.
- **Background:** Superficie (#151A24) opaca; Rilievo (#1E2531) per le righe interne selezionabili.
- **Shadow Strategy:** nessuna ombra; stacco per tono più `inset 0 1px 0 rgba(255,255,255,0.05)` sul bordo alto.
- **Border:** nessuno per default. Solo l'elemento a fuoco riceve il bordo colorato del faro.
- **Internal Padding:** 20px.

### Inputs / Fields
- **Style:** fondo Rilievo (#1E2531), nessun bordo a riposo, raggio 14, altezza 52, testo 17px.
- **Focus:** bordo Blu Segnale da 1px e alone `0 0 0 4px rgba(10,132,255,0.18)`; nessun cambio di dimensione, così il layout non salta.
- **Error:** bordo Rosa Record e messaggio sotto il campo, mai solo il colore.
- **Numerici:** cifre tabulari, tastiera decimale, allineamento a destra quando stanno in riga con altri numeri.

### Navigation
- **Mobile:** barra schede in vetro **flottante**, staccata dai bordi di 12px, raggio 34, ancorata sopra la safe area. Icona attiva in Blu Segnale con pastiglia di sfondo; le altre in Nebbia. Etichette in Label 12px.
- **Web:** rail sinistra in vetro larga 240px, voci a pillola, voce attiva con fondo blu al 14% e testo bianco. Sotto i 1024px diventa una barra in vetro in basso.

### Set Row (signature)
La riga di serie del tracker è il componente che il prodotto usa più di ogni altro, e va progettato per il caso peggiore: mani sudate, occhio distratto. Altezza 64px, numero di serie in pastiglia a sinistra, due campi numerici grandi (carico × ripetizioni) in cifre tabulari, e a destra un bersaglio circolare da 48px per confermare. A conferma la riga passa a Menta Compiuta con una molla e un colpo aptico, e il numero resta leggibile.

### Glass Surface (signature)
Il mattone del livello vetro: sfocatura nativa (`expo-blur` sul mobile, `backdrop-filter` sul web), tinta scura al 62%, luce speculare sul bordo alto in gradiente, bordo capello bianco all'8%, ombra `lift-glass`. Espone la sola variante di forma (pillola, 34, 26) e non accetta contenuti di sola lettura lunghi.

### Activity Ring (signature)
Anelli concentrici a tratto tondo per gli stati di completamento (seduta, settimana, aderenza). Tratto 12px, fondo dell'anello al 12% del colore, animazione a molla dal valore precedente. Un anello per metrica, massimo tre concentrici.

## Do's and Don'ts

### Do:
- **Do** usare il vetro solo per barre schede, testate, fogli, timer e barre d'azione.
- **Do** dare a ogni schermata **un solo** elemento dominante, dimensionato per essere letto in tre secondi.
- **Do** applicare le cifre tabulari a ogni numero che cambia.
- **Do** calcolare i raggi interni come raggio esterno meno padding.
- **Do** accompagnare ogni conferma importante con una risposta aptica leggera.
- **Do** far rispettare al movimento la preferenza di sistema di riduzione del movimento.
- **Do** affiancare sempre al colore una seconda indicazione (icona, etichetta o forma).

### Don't:
- **Don't** mettere testo di lettura, grafici o tabelle sopra una superficie sfocata.
- **Don't** usare più di un alone colorato per schermata.
- **Don't** reintrodurre il gradiente blu-elettrico, i bordi bianchi all'8% su card di contenuto o i bagliori neon del sistema precedente.
- **Don't** scendere sotto 17px per il corpo del testo mobile o sotto 44×44pt per un bersaglio tattile.
- **Don't** usare un colore segnale fuori dal suo significato.
- **Don't** usare emoji come iconografia dei controlli: le emoji restano ammesse solo dentro contenuti scritti e stati vuoti.
- **Don't** animare con curve lineari: il movimento del sistema è a molla.
