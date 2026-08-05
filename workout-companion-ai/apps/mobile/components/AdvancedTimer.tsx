import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TIMER_MODES, type TimerMode } from '@wc/shared';
import { colors, radius, spacing, sharedStyles, tabular, type } from '../lib/theme';
import { formatClock } from '../lib/utils';
import { playCue } from '../lib/cues';
import { ActivityRing } from './ActivityRing';
import { Card } from './Card';
import { GlassSurface } from './Glass';
import { Press } from './Press';
import { PrimaryButton } from './PrimaryButton';

type IconName = keyof typeof Ionicons.glyphMap;

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Chiamato quando un countdown/isometria con "auto avanti" arriva a zero. */
  onAutoNext?: () => void;
}

const MODE_LIST = Object.values(TIMER_MODES);
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** L'icona di ogni modalità: i comandi non usano emoji. */
const MODE_ICON: Record<TimerMode, IconName> = {
  countdown: 'hourglass',
  countup: 'stopwatch',
  emom: 'repeat',
  amrap: 'flame',
  hold: 'body',
};

/** Stepper compatto +/- con bersagli da 48pt e valore in cifre tabulari. */
function Stepper({
  label,
  value,
  onChange,
  step,
  min,
  max,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
  format: (v: number) => string;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Press
          style={styles.stepBtn}
          onPress={() => onChange(clamp(value - step, min, max))}
          accessibilityLabel={`Diminuisci ${label}`}
        >
          <Ionicons name="remove" size={20} color={colors.accent} />
        </Press>
        <Text style={[styles.stepperValue, tabular]}>{format(value)}</Text>
        <Press
          style={styles.stepBtn}
          onPress={() => onChange(clamp(value + step, min, max))}
          accessibilityLabel={`Aumenta ${label}`}
        >
          <Ionicons name="add" size={20} color={colors.accent} />
        </Press>
      </View>
    </View>
  );
}

/** Riga di preferenza: icona, testo a 17px e interruttore. */
function ToggleRow({
  icon,
  label,
  value,
  onValueChange,
}: {
  icon: IconName;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Ionicons name={icon} size={20} color={value ? colors.accent : colors.textTertiary} />
      <Text style={[type.body, styles.toggleLabel]}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: colors.accent, false: colors.line }} />
    </View>
  );
}

export function AdvancedTimer({ visible, onClose, onAutoNext }: Props) {
  const [phase, setPhase] = useState<'setup' | 'run'>('setup');
  const [mode, setMode] = useState<TimerMode>('countdown');
  const [duration, setDuration] = useState(60); // countdown / amrap / hold target (s)
  const [interval, setIntervalSec] = useState(60); // emom (s)
  const [rounds, setRounds] = useState(10); // emom
  const [sound, setSound] = useState(true);
  const [vibrate, setVibrate] = useState(true);
  const [autoNext, setAutoNext] = useState(false);

  // Stato di esecuzione (motore basato su timestamp).
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // secondi trascorsi (float)
  const [amrapRounds, setAmrapRounds] = useState(0);
  const baseMsRef = useRef(0);
  const startEpochRef = useRef<number | null>(null);
  const lastRoundRef = useRef(0);
  const lastTickSecRef = useRef(-1);
  const finishedRef = useRef(false);

  // Altezza dei due livelli in vetro: il contenuto in ferro ci scorre sotto.
  const [headerH, setHeaderH] = useState(72);
  const [barH, setBarH] = useState(88);
  const { width, height } = useWindowDimensions();

  const resetEngine = useCallback(() => {
    baseMsRef.current = 0;
    startEpochRef.current = null;
    lastRoundRef.current = 0;
    lastTickSecRef.current = -1;
    finishedRef.current = false;
    setElapsed(0);
    setAmrapRounds(0);
    setRunning(false);
  }, []);

  // Reset completo alla chiusura/riapertura.
  useEffect(() => {
    if (!visible) {
      resetEngine();
      setPhase('setup');
    }
  }, [visible, resetEngine]);

  // Tick del motore mentre è in esecuzione.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const startEpoch = startEpochRef.current;
      if (startEpoch == null) return;
      const elapsedSec = (baseMsRef.current + (Date.now() - startEpoch)) / 1000;
      setElapsed(elapsedSec);

      if (mode === 'countdown' || mode === 'amrap' || (mode === 'hold' && duration > 0)) {
        const remaining = duration - elapsedSec;
        const whole = Math.ceil(remaining);
        if (whole <= 3 && whole > 0 && whole !== lastTickSecRef.current) {
          lastTickSecRef.current = whole;
          playCue('tick', { sound, vibrate });
        }
        if (remaining <= 0 && !finishedRef.current) {
          finishedRef.current = true;
          playCue('end', { sound, vibrate });
          if (mode === 'hold') return; // l'isometria continua a contare oltre il target
          stopAt(duration);
          if (autoNext && onAutoNext) onAutoNext();
        }
      } else if (mode === 'emom') {
        const round = Math.floor(elapsedSec / interval) + 1;
        if (round > lastRoundRef.current && round <= rounds) {
          lastRoundRef.current = round;
          if (round > 1) playCue('round', { sound, vibrate });
        }
        if (elapsedSec >= interval * rounds && !finishedRef.current) {
          finishedRef.current = true;
          playCue('end', { sound, vibrate });
          stopAt(interval * rounds);
          if (autoNext && onAutoNext) onAutoNext();
        }
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode, duration, interval, rounds, sound, vibrate, autoNext]);

  function stopAt(sec: number) {
    baseMsRef.current = sec * 1000;
    startEpochRef.current = null;
    setElapsed(sec);
    setRunning(false);
  }

  function start() {
    resetEngine();
    lastRoundRef.current = 1; // il round 1 è già in corso all'avvio
    startEpochRef.current = Date.now();
    setRunning(true);
    setPhase('run');
    playCue('round', { sound, vibrate });
  }

  function togglePause() {
    if (running) {
      baseMsRef.current += Date.now() - (startEpochRef.current ?? Date.now());
      startEpochRef.current = null;
      setRunning(false);
    } else {
      finishedRef.current = false;
      startEpochRef.current = Date.now();
      setRunning(true);
    }
  }

  function restart() {
    resetEngine();
    lastRoundRef.current = 1;
    startEpochRef.current = Date.now();
    setRunning(true);
  }

  // ---- Valori mostrati ----
  // Il colore è un segnale: blu mentre scorre, ambra negli ultimi secondi,
  // menta quando il tempo è compiuto.
  let big = '00:00';
  let caption = '';
  let fraction = 0;
  let tint: string = colors.accent;
  if (mode === 'countup') {
    big = formatClock(elapsed);
    caption = 'Cronometro';
  } else if (mode === 'countdown') {
    big = formatClock(Math.max(0, duration - elapsed));
    fraction = duration > 0 ? Math.max(0, duration - elapsed) / duration : 0;
    caption = 'Countdown';
    tint = duration - elapsed <= 0 ? colors.mint : duration - elapsed <= 5 ? colors.amber : colors.accent;
  } else if (mode === 'amrap') {
    big = formatClock(Math.max(0, duration - elapsed));
    fraction = duration > 0 ? Math.max(0, duration - elapsed) / duration : 0;
    caption = `AMRAP · ${amrapRounds} round`;
    tint = duration - elapsed <= 0 ? colors.mint : duration - elapsed <= 5 ? colors.amber : colors.accent;
  } else if (mode === 'hold') {
    big = formatClock(elapsed);
    fraction = duration > 0 ? Math.min(1, elapsed / duration) : 0;
    caption = duration > 0 ? `Target ${formatClock(duration)}` : 'Isometria';
    if (duration > 0) {
      tint = elapsed >= duration ? colors.mint : duration - elapsed <= 5 ? colors.amber : colors.accent;
    }
  } else if (mode === 'emom') {
    const withinInterval = elapsed % interval;
    const round = Math.min(rounds, Math.floor(elapsed / interval) + 1);
    big = formatClock(interval - withinInterval);
    fraction = (interval - withinInterval) / interval;
    caption = `EMOM · Round ${round}/${rounds}`;
    tint = interval - withinInterval <= 3 ? colors.amber : colors.accent;
  }

  // Il quadrante principale del setup: il numero che stai impostando domina.
  const dial =
    mode === 'countdown' || mode === 'hold'
      ? {
          label: mode === 'hold' ? 'Target (0 = libero)' : 'Durata',
          value: duration,
          onChange: setDuration,
          step: 15,
          min: 0,
          max: 3600,
        }
      : mode === 'amrap'
        ? { label: 'Durata totale', value: duration, onChange: setDuration, step: 60, min: 60, max: 3600 }
        : mode === 'emom'
          ? { label: 'Intervallo', value: interval, onChange: setIntervalSec, step: 15, min: 15, max: 600 }
          : null;

  // L'anello ha senso solo dove esiste un traguardo.
  const hasRing = mode !== 'countup' && !(mode === 'hold' && duration <= 0);
  const ringSize = Math.round(Math.min(width - spacing.xl * 2, height * 0.42, 340));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={sharedStyles.screen} edges={['top', 'bottom']}>
        <View style={styles.flex}>
          {phase === 'setup' ? (
            <ScrollView
              contentContainerStyle={[
                styles.setup,
                { paddingTop: headerH + spacing.xxl, paddingBottom: barH + spacing.xxl },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <Text style={type.label}>Modalità</Text>
              <View style={styles.modeGrid}>
                {MODE_LIST.map((m) => {
                  const active = mode === m.key;
                  return (
                    <Press
                      key={m.key}
                      style={[styles.modeChip, active && styles.modeChipActive]}
                      onPress={() => setMode(m.key)}
                      accessibilityLabel={m.label}
                    >
                      <Ionicons
                        name={MODE_ICON[m.key]}
                        size={20}
                        color={active ? colors.accent : colors.textSecondary}
                      />
                      <Text style={[styles.modeLabel, active && styles.modeLabelActive]} numberOfLines={1}>
                        {m.label}
                      </Text>
                    </Press>
                  );
                })}
              </View>
              <Text style={styles.hint}>{TIMER_MODES[mode].hint}</Text>

              {dial ? (
                <Card>
                  <Text style={type.label}>{dial.label}</Text>
                  <View style={styles.dialRow}>
                    <Press
                      style={styles.dialBtn}
                      onPress={() => dial.onChange(clamp(dial.value - dial.step, dial.min, dial.max))}
                      accessibilityLabel={`Diminuisci ${dial.label}`}
                    >
                      <Ionicons name="remove" size={26} color={colors.accent} />
                    </Press>
                    <Text
                      style={[type.metric, tabular, styles.dialValue]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {formatClock(dial.value)}
                    </Text>
                    <Press
                      style={styles.dialBtn}
                      onPress={() => dial.onChange(clamp(dial.value + dial.step, dial.min, dial.max))}
                      accessibilityLabel={`Aumenta ${dial.label}`}
                    >
                      <Ionicons name="add" size={26} color={colors.accent} />
                    </Press>
                  </View>

                  {mode === 'emom' ? (
                    <>
                      <View style={styles.hair} />
                      <Stepper
                        label="Round"
                        value={rounds}
                        onChange={setRounds}
                        step={1}
                        min={1}
                        max={60}
                        format={(v) => String(v)}
                      />
                    </>
                  ) : null}
                </Card>
              ) : null}

              <Card>
                <ToggleRow icon="volume-high" label="Suono" value={sound} onValueChange={setSound} />
                <View style={styles.hair} />
                <ToggleRow icon="phone-portrait" label="Vibrazione" value={vibrate} onValueChange={setVibrate} />
                {mode === 'countdown' || mode === 'hold' || mode === 'emom' ? (
                  <>
                    <View style={styles.hair} />
                    <ToggleRow
                      icon="play-forward"
                      label="Passa all'esercizio successivo alla fine"
                      value={autoNext}
                      onValueChange={setAutoNext}
                    />
                  </>
                ) : null}
              </Card>
            </ScrollView>
          ) : (
            // FERRO a tutto schermo: sotto il numero non c'è mai vetro.
            <View style={[styles.run, { paddingTop: headerH + spacing.lg, paddingBottom: barH + spacing.lg }]}>
              <View style={styles.runCaption}>
                <Ionicons name={MODE_ICON[mode]} size={16} color={tint} />
                <Text style={[styles.runCaptionText, { color: tint }]} numberOfLines={1}>
                  {caption}
                </Text>
              </View>

              {hasRing ? (
                <ActivityRing progress={fraction} color={tint} size={ringSize} strokeWidth={14}>
                  <View style={{ width: ringSize - 76 }}>
                    <Text
                      style={[type.metric, tabular, styles.bigClock]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {big}
                    </Text>
                  </View>
                </ActivityRing>
              ) : (
                <Text style={[type.metric, tabular, styles.bigClock]} numberOfLines={1} adjustsFontSizeToFit>
                  {big}
                </Text>
              )}
            </View>
          )}

          {/* VETRO 1 — testata ancorata: il contenuto le scorre sotto. */}
          <View
            style={styles.headerAnchor}
            pointerEvents="box-none"
            onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
          >
            <GlassSurface cornerRadius={radius.xl} padding={spacing.md}>
              <View style={styles.headerRow}>
                <View style={styles.headerText}>
                  <Text style={styles.headerTitle}>Timer</Text>
                  <Text style={styles.headerSub} numberOfLines={1}>
                    {phase === 'run'
                      ? running
                        ? 'In corso'
                        : 'In pausa'
                      : TIMER_MODES[mode].label}
                  </Text>
                </View>
                <Press onPress={onClose} style={styles.glassBtn} accessibilityLabel="Chiudi il timer">
                  <Ionicons name="close" size={22} color={colors.textPrimary} />
                </Press>
              </View>
            </GlassSurface>
          </View>

          {/* VETRO 2 — i comandi stanno in basso, sotto il pollice. */}
          <View
            style={styles.barAnchor}
            pointerEvents="box-none"
            onLayout={(e) => setBarH(e.nativeEvent.layout.height)}
          >
            <GlassSurface cornerRadius={radius.xl} padding={spacing.md}>
              {phase === 'setup' ? (
                <PrimaryButton label="AVVIA" onPress={start} />
              ) : (
                <View style={styles.bar}>
                  {mode === 'amrap' ? (
                    <Press
                      onPress={() => setAmrapRounds((r) => r + 1)}
                      haptic="success"
                      style={styles.roundBtn}
                      accessibilityLabel="Segna un round completato"
                    >
                      <Ionicons name="add-circle" size={22} color={colors.amber} />
                      <Text style={styles.roundBtnText}>ROUND</Text>
                      <Text style={[styles.roundBtnCount, tabular]}>{amrapRounds}</Text>
                    </Press>
                  ) : null}

                  <View style={styles.controls}>
                    <PrimaryButton
                      label={running ? 'PAUSA' : 'RIPRENDI'}
                      onPress={togglePause}
                      variant={running ? 'ghost' : 'primary'}
                      style={running ? [styles.control, styles.ghostFill] : styles.control}
                    />
                    <PrimaryButton
                      label="RIAVVIA"
                      onPress={restart}
                      variant="ghost"
                      style={[styles.control, styles.ghostFill]}
                    />
                  </View>

                  <Press
                    onPress={() => setPhase('setup')}
                    style={styles.backToSetup}
                    accessibilityLabel="Cambia timer"
                  >
                    <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
                    <Text style={styles.backToSetupText}>Cambia timer</Text>
                  </Press>
                </View>
              )}
            </GlassSurface>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  // --- VETRO: testata ---
  headerAnchor: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
    paddingLeft: spacing.sm,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerSub: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  glassBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },

  // --- FERRO: impostazione ---
  setup: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    minWidth: 104,
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    // Il bordo esiste sempre: selezionare non deve spostare la griglia.
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeChipActive: {
    backgroundColor: 'rgba(10,132,255,0.16)',
    borderColor: colors.accent,
  },
  modeLabel: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  modeLabelActive: {
    color: colors.textPrimary,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 24,
  },

  // Quadrante dominante: il numero che stai impostando.
  dialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dialBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.raised,
  },
  dialValue: {
    flex: 1,
    textAlign: 'center',
  },

  hair: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  stepperLabel: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
    flexShrink: 1,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.raised,
  },
  stepperValue: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    minWidth: 64,
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
  },
  toggleLabel: {
    flex: 1,
  },

  // --- FERRO: esecuzione ---
  run: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.xxl,
  },
  runCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  runCaptionText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  bigClock: {
    fontSize: 88,
    lineHeight: 92,
    letterSpacing: -2.5,
    textAlign: 'center',
  },

  // --- VETRO: barra dei comandi ---
  barAnchor: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.md,
    right: spacing.md,
  },
  bar: {
    gap: spacing.sm,
  },
  roundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    minHeight: 64,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,159,10,0.16)',
    borderWidth: 1,
    borderColor: colors.amber,
  },
  roundBtnText: {
    color: colors.amber,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  roundBtnCount: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  control: {
    flex: 1,
  },
  ghostFill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  backToSetup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
  },
  backToSetupText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
