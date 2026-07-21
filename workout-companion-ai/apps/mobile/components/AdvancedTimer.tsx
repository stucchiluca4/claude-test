import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TIMER_MODES, type TimerMode } from '@wc/shared';
import { colors, radius, spacing, sharedStyles } from '../lib/theme';
import { formatClock } from '../lib/utils';
import { playCue } from '../lib/cues';
import { PrimaryButton } from './PrimaryButton';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Chiamato quando un countdown/isometria con "auto avanti" arriva a zero. */
  onAutoNext?: () => void;
}

const MODE_LIST = Object.values(TIMER_MODES);
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Stepper +/- con etichetta e valore formattato. */
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
        <Pressable style={styles.stepBtn} onPress={() => onChange(clamp(value - step, min, max))} hitSlop={6}>
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{format(value)}</Text>
        <Pressable style={styles.stepBtn} onPress={() => onChange(clamp(value + step, min, max))} hitSlop={6}>
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
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
  let big = '00:00';
  let caption = '';
  let fraction = 0;
  if (mode === 'countup') {
    big = formatClock(elapsed);
    caption = 'Cronometro';
  } else if (mode === 'countdown') {
    big = formatClock(Math.max(0, duration - elapsed));
    fraction = duration > 0 ? Math.max(0, duration - elapsed) / duration : 0;
    caption = 'Countdown';
  } else if (mode === 'amrap') {
    big = formatClock(Math.max(0, duration - elapsed));
    fraction = duration > 0 ? Math.max(0, duration - elapsed) / duration : 0;
    caption = `AMRAP · ${amrapRounds} round`;
  } else if (mode === 'hold') {
    big = formatClock(elapsed);
    fraction = duration > 0 ? Math.min(1, elapsed / duration) : 0;
    caption = duration > 0 ? `Target ${formatClock(duration)}` : 'Isometria';
  } else if (mode === 'emom') {
    const withinInterval = elapsed % interval;
    const round = Math.min(rounds, Math.floor(elapsed / interval) + 1);
    big = formatClock(interval - withinInterval);
    fraction = (interval - withinInterval) / interval;
    caption = `EMOM · Round ${round}/${rounds}`;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={sharedStyles.screen} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Timer</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        {phase === 'setup' ? (
          <ScrollView contentContainerStyle={styles.setup}>
            <Text style={sharedStyles.sectionLabel}>Modalità</Text>
            <View style={styles.modeGrid}>
              {MODE_LIST.map((m) => (
                <Pressable
                  key={m.key}
                  style={[styles.modeChip, mode === m.key && styles.modeChipActive]}
                  onPress={() => setMode(m.key)}
                >
                  <Text style={styles.modeEmoji}>{m.emoji}</Text>
                  <Text style={styles.modeLabel}>{m.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={sharedStyles.muted}>{TIMER_MODES[mode].hint}</Text>

            {(mode === 'countdown' || mode === 'hold') && (
              <Stepper
                label={mode === 'hold' ? 'Target (0 = libero)' : 'Durata'}
                value={duration}
                onChange={setDuration}
                step={15}
                min={0}
                max={3600}
                format={formatClock}
              />
            )}
            {mode === 'amrap' && (
              <Stepper
                label="Durata totale"
                value={duration}
                onChange={setDuration}
                step={60}
                min={60}
                max={3600}
                format={formatClock}
              />
            )}
            {mode === 'emom' && (
              <>
                <Stepper label="Intervallo" value={interval} onChange={setIntervalSec} step={15} min={15} max={600} format={formatClock} />
                <Stepper label="Round" value={rounds} onChange={setRounds} step={1} min={1} max={60} format={(v) => String(v)} />
              </>
            )}

            <View style={styles.toggleRow}>
              <Text style={sharedStyles.body}>🔊 Suono</Text>
              <Switch value={sound} onValueChange={setSound} trackColor={{ true: colors.accent }} />
            </View>
            <View style={styles.toggleRow}>
              <Text style={sharedStyles.body}>📳 Vibrazione</Text>
              <Switch value={vibrate} onValueChange={setVibrate} trackColor={{ true: colors.accent }} />
            </View>
            {(mode === 'countdown' || mode === 'hold' || mode === 'emom') && (
              <View style={styles.toggleRow}>
                <Text style={sharedStyles.body}>⏭ Passa all'esercizio successivo alla fine</Text>
                <Switch value={autoNext} onValueChange={setAutoNext} trackColor={{ true: colors.accent }} />
              </View>
            )}

            <PrimaryButton label="AVVIA" onPress={start} />
          </ScrollView>
        ) : (
          <View style={styles.run}>
            <Text style={styles.runCaption}>{caption}</Text>
            <Text style={styles.bigClock}>{big}</Text>
            {(mode === 'countdown' || mode === 'amrap' || mode === 'hold' || mode === 'emom') && (
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round(fraction * 100)}%` }]} />
              </View>
            )}

            {mode === 'amrap' && (
              <Pressable style={styles.roundBtn} onPress={() => setAmrapRounds((r) => r + 1)}>
                <Text style={styles.roundBtnText}>+1 ROUND ({amrapRounds})</Text>
              </Pressable>
            )}

            <View style={styles.controls}>
              <PrimaryButton
                label={running ? 'PAUSA' : 'RIPRENDI'}
                onPress={togglePause}
                variant={running ? 'ghost' : 'primary'}
                style={styles.control}
              />
              <PrimaryButton label="RIAVVIA" onPress={restart} variant="ghost" style={styles.control} />
            </View>
            <Pressable onPress={() => setPhase('setup')} hitSlop={8} style={styles.backToSetup}>
              <Text style={styles.backToSetupText}>‹ Cambia timer</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  close: {
    color: colors.textSecondary,
    fontSize: 20,
    fontWeight: '700',
  },
  setup: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  modeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: 4,
    minWidth: 96,
    flexGrow: 1,
  },
  modeChipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(56,189,248,0.10)',
  },
  modeEmoji: {
    fontSize: 22,
  },
  modeLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  stepperLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '800',
  },
  stepperValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    minWidth: 64,
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  run: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  runCaption: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bigClock: {
    color: colors.textPrimary,
    fontSize: 84,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  track: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  roundBtn: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  roundBtnText: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '800',
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  control: {
    flex: 1,
  },
  backToSetup: {
    paddingVertical: spacing.sm,
  },
  backToSetupText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
