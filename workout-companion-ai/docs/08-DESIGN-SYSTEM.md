# 🎛️ Design System "Executive Control Room" — VINCOLANTE
## Workout Companion AI — specifiche grafiche obbligatorie per ogni vista

> **Stato: TASSATIVO.** Ogni schermata, componente o grafico generato per questa
> codebase deve rispettare queste regole. Le logiche funzionali e i flussi dati
> NON vengono alterati da questo documento: riguarda solo la presentazione.

---

## 1. Tipografia istituzionale

| Ruolo | Font | Peso | Note |
|---|---|---|---|
| Titoli moduli principali | **Inter** (sans-serif geometrico) | **Bold / ExtraBold (700-800)** | tracking leggermente negativo |
| Macro-numeri KPI | Inter | **ExtraBold (800)** | `tabular-nums`, colore **bianco puro** |
| Testo corrente | Inter | Regular (400-450) | |
| Diciture secondarie / dettagli | Inter | Light/Regular (300-400) | colore celeste desaturato, spesso minuscolo |
| Etichette/eyebrow | Inter | SemiBold (600) | maiuscoletto con letter-spacing |

- Fallback: `Inter, Roboto, -apple-system, "Segoe UI", sans-serif`.
- Sul web il font è caricato con `next/font` (già configurato in `app/layout.tsx`).

## 2. Corporate Palette vincolante

| Token | Hex | Uso ESCLUSIVO |
|---|---|---|
| `navy` (Blu Deep) | `#070D1A` sfondo app · `#0D1626` contenitori dati | Sfondo dashboard e pannelli — look "Control Room" |
| `accent` (Blu Primario / Electric) | `#38BDF8` (hover `#0EA5E9`) | Dati di spicco, trend positivi, stati attivi, CTA |
| `avio` (Blu Medio) | `#2E6BE0` / `#3987E5` | Barre dei grafici, elementi standard, griglie secondarie |
| `celeste` (Light Blue) | `#9CD9FF` · bordi `rgba(186,224,255,.14)` | Contrasti sottili, bordi, indicatori secondari |
| `white` (Bianco Puro) | `#FFFFFF` | SOLO testi e numeri chiave dei KPI |
| testo secondario | `#8FA3C0` (celeste desaturato) | diciture di contorno |

**Eccezione funzionale documentata** (unica ammessa): gli stati distruttivi o di
rischio (`Elimina`, "a rischio abbandono", errori) mantengono il rosso `#EF4444`
e gli avvisi il `#F59E0B` — sono colori di *stato*, non di brand, e rimuoverli
comprometterebbe la sicurezza d'uso. Tutti i "trend positivi" e le conferme
usano l'**Electric Blue**, mai il verde.

## 3. Pseudo-3D & volume (High-End Analytics)

- **Vietati** componenti piatti "scolastici": tabelle grigie, grafici default.
- Gradienti profondi **Deep → Electric**: `linear-gradient(135deg,#1D4ED8,#38BDF8)`
  per CTA, barre in evidenza e riempimenti area.
- Ombre direzionali sui pannelli: `box-shadow: 0 18px 40px -18px rgba(2,8,20,.8)`.
- **KPI card**: angoli arrotondati (14-16px) + illuminazione interna neon:

```css
.glow {
  box-shadow:
    0 0 0 1px rgba(56,189,248,.22),          /* filo neon sul bordo */
    0 0 26px -8px rgba(56,189,248,.38),      /* alone esterno */
    inset 0 0 22px -14px rgba(56,189,248,.45); /* luce interna */
}
```

## 4. Micro-animazioni fluide (60fps)

- **Ingresso elementi**: translateY + fade (`animation: rise .5s cubic-bezier(.2,.8,.3,1)`),
  con `animation-delay` scalato per gli elenchi (stagger).
- **Contatori KPI**: effetto *rolling count* da 0 al valore (componente
  `<AnimatedNumber>`, ~0,9s, easing cubico).
- **Grafici**: barre che "si sollevano" da zero e linee che si disegnano
  (Recharts: animazioni attive di default; SVG custom: `stroke-dashoffset`).
- Animare SOLO `transform` e `opacity` (compositing GPU → 60fps stabili).
- Rispettare sempre `prefers-reduced-motion: reduce` → stato finale statico.

## 5. Glassmorphism (pannelli, popup, contenitori grafici)

```css
.glass {
  background: rgba(16, 20, 30, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

- Applicato a: card, pannelli laterali, dropdown, dialog, contenitori dei grafici.
- Su **React Native** (nessun `backdrop-filter`): approssimazione con sfondi
  `rgba(13,22,38,0.92)` + bordo `rgba(186,224,255,0.12)` — stesso linguaggio visivo
  senza dipendenze extra.

## 6. Grafici: regola dei blu + codifica secondaria

La palette monocromatica impedisce di distinguere le serie per tinta. Quindi
**ogni grafico multi-serie DEVE combinare**:

1. Scala blu a lightness crescente: `#2E6BE0` → `#38BDF8` → `#9CD9FF`
2. **Pattern di tratteggio diversi** per le linee (pieno / `6 4` / `2 5`)
3. Legenda sempre presente + tooltip al passaggio
4. Griglie recessive `#22314F`, assi e testi `#8FA3C0`, tooltip su fondo `#0D1626`

*(verificato con il validatore dataviz: la separazione CVD della scala è nella
fascia ammessa SOLO con codifica secondaria — per questo i punti 2-3 sono
obbligatori, non decorativi)*

## 7. Dove vive nel codice

| Cosa | File |
|---|---|
| Token Tailwind (web) | `apps/web/tailwind.config.ts` |
| Utility `.glass` `.glow` `.grad-primary` + keyframes | `apps/web/app/globals.css` |
| Componenti base (Card, KpiCard, bottoni) | `apps/web/components/ui.tsx` |
| Rolling counter | `apps/web/components/animated-number.tsx` |
| Palette condivisa (usata dall'app mobile) | `packages/shared/src/constants.ts` → `COLORS` |
| Tema mobile | `apps/mobile/lib/theme.ts` |
