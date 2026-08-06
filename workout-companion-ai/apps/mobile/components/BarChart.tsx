import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, tabular, type } from '../lib/theme';

export interface BarDatum {
  label: string;
  value: number;
  /** Testo mostrato sopra la barra (default: valore arrotondato). */
  display?: string;
}

interface Props {
  data: BarDatum[];
  color?: string;
  height?: number;
  /** Mostra il valore sopra ogni barra. */
  showValues?: boolean;
  /**
   * Cima minima della scala. Serve alle serie di conteggi: senza, una settimana
   * da un solo allenamento disegnerebbe una barra piena quanto una da sei.
   */
  maxValue?: number;
  /**
   * Taglia l'asse a questo valore invece che a zero, per le grandezze che
   * variano di poche unità percentuali (l'1RM stimato). Il taglio non è mai
   * silenzioso: sotto le barre resta uno zoccolo e sotto il grafico la riga
   * che dichiara da dove parte l'asse.
   */
  baseline?: number;
  /** Unità della serie: entra nella nota dell'asse e nella lettura vocale. */
  unit?: string;
  /** Cosa rappresenta la serie, per chi usa VoiceOver. */
  a11yLabel?: string;
}

/** Altezza dello zoccolo che segnala l'asse tagliato. */
const PLINTH = 8;

/**
 * Istogramma essenziale costruito con sole View: vive sul livello FERRO,
 * quindi resta perfettamente leggibile (nessuna sfocatura sotto i dati).
 */
export function BarChart({
  data,
  color = colors.accent,
  height = 132,
  showValues = true,
  maxValue,
  baseline,
  unit,
  a11yLabel,
}: Props) {
  const observed = Math.max(0, ...data.map((d) => d.value));
  // La base non può superare i dati, altrimenti il grafico resterebbe vuoto.
  const cut = baseline != null && baseline < observed;
  const base = cut ? Math.max(0, baseline as number) : 0;
  const top = Math.max(maxValue ?? observed, base + 1);
  const span = top - base;
  const plinth = cut ? PLINTH : 0;
  // Spazio riservato al valore sopra la barra (15 di testo + 4 di distacco).
  const plot = height - 19 - plinth;

  const read = (d: BarDatum) => `${d.display ?? Math.round(d.value)}${unit ? ` ${unit}` : ''}`;

  return (
    <View
      style={styles.wrap}
      // Un solo punto di fuoco che legge tutta la serie: senza questo il
      // grafico è muto per chi usa VoiceOver (DESIGN.md § Accessibility).
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${a11yLabel ?? 'Grafico a barre'}. ${data
        .map((d) => `${d.label}: ${read(d)}`)
        .join('; ')}`}
    >
      <View style={[styles.bars, { height: height - plinth }]}>
        {data.map((d, i) => {
          const isPeak = d.value === observed && d.value > 0;
          const ratio = Math.min(1, Math.max(0, (d.value - base) / span));
          const barHeight = Math.max(d.value > 0 ? 4 : 0, ratio * plot);
          return (
            <View key={`${d.label}-${i}`} style={styles.col}>
              {showValues && d.value > 0 ? (
                <Text style={[styles.value, tabular, isPeak && { color: colors.textPrimary }]} numberOfLines={1}>
                  {d.display ?? Math.round(d.value)}
                </Text>
              ) : (
                <View style={styles.valueSpacer} />
              )}
              <View style={[styles.slot, { height: plot }]}>
                <View
                  style={[
                    styles.bar,
                    { height: barHeight, backgroundColor: color, opacity: isPeak ? 1 : 0.55 },
                  ]}
                />
              </View>
              {/* Lo zoccolo dice che sotto l'asse la barra continua. */}
              {cut ? <View style={[styles.plinth, { backgroundColor: color }]} /> : null}
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {data.map((d, i) => (
          <Text key={`${d.label}-l-${i}`} style={styles.label} numberOfLines={1}>
            {d.label}
          </Text>
        ))}
      </View>
      {cut ? (
        <Text style={[styles.axisNote, tabular]}>
          L'asse parte da {Math.round(base)}
          {unit ? ` ${unit}` : ''}, non da zero.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  slot: {
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '72%',
    borderRadius: 6,
  },
  /** Continuazione spenta della barra sotto l'asse tagliato. */
  plinth: {
    width: '72%',
    height: PLINTH,
    marginTop: 2,
    borderRadius: 3,
    opacity: 0.14,
  },
  value: {
    // Numero: taglio arrotondato, 12px e Nebbia per restare leggibile.
    fontFamily: type.metricXs.fontFamily,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
  },
  valueSpacer: {
    height: 15,
  },
  labels: {
    flexDirection: 'row',
    gap: 5,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    // Etichetta dell'asse: 12px in Nebbia, non più in Fumo (troppo debole).
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  axisNote: {
    marginTop: 2,
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
  },
});
