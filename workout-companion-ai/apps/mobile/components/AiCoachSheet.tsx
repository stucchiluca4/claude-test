import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { prefersReducedMotion, spring as reduceAware } from '../lib/a11y';
import { supabase } from '../lib/supabase';
import { colors, concentric, radius, spacing, sharedStyles, type } from '../lib/theme';
import { GlassSurface } from './Glass';
import { Press } from './Press';

interface Props {
  visible: boolean;
  exerciseId: string;
  workoutExerciseId: string;
  exerciseName: string;
  coachClientId: string | null;
  onClose: () => void;
}

const SUGGESTIONS = [
  'Mi fa male la spalla durante questo esercizio.',
  'Non riesco a finire le ripetizioni previste.',
  'Posso sostituire questo esercizio con un altro?',
  'Devo aumentare il carico la prossima volta?',
];

/**
 * L'azione che sveglia il motore. Il viola è riservato all'AI in tutto il
 * prodotto: qui è il colore del gesto, non una decorazione.
 */
function AskButton({
  label,
  loading,
  onPress,
}: {
  label: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Press
      onPress={onPress}
      disabled={loading}
      haptic="medium"
      style={[styles.ask, loading && styles.askDim]}
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={colors.textPrimary} />
      ) : (
        <View style={styles.askRow}>
          <Ionicons name="sparkles" size={18} color={colors.textPrimary} />
          <Text style={styles.askLabel} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Press>
  );
}

/**
 * La molla del foglio: il sistema non anima mai con curve lineari.
 * Le soglie di quiete tagliano la coda impercettibile del rimbalzo, così alla
 * chiusura il foglio si smonta appena il movimento è finito davvero invece di
 * restare lì, invisibile, a mangiarsi i tocchi.
 */
const sheetSpring = (toValue: 0 | 1) => ({
  toValue,
  useNativeDriver: true,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
  ...reduceAware({ damping: 22, stiffness: 180, mass: 1 }),
});

/**
 * Ingresso e uscita del foglio a molla (DESIGN.md § movimento): il fondo si
 * dissolve, il foglio sale da 28px e passa da scala 0.98 a 1. Alla chiusura
 * il percorso è invertito e `onClose` scatta solo a movimento finito, così il
 * foglio non sparisce di colpo. Con "riduci movimento" attivo si chiude subito.
 */
function useSheetEnter(visible: boolean, onClose: () => void) {
  const [mounted, setMounted] = useState(visible);
  // Si parte sempre da fuori: anche se il foglio nasce già aperto, entra a molla.
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(enter, sheetSpring(1)).start();
      return;
    }
    // Chiusura decisa da fuori: prima il percorso inverso, poi smonto il foglio.
    if (prefersReducedMotion()) {
      enter.setValue(0);
      setMounted(false);
      return;
    }
    Animated.spring(enter, sheetSpring(0)).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, enter]);

  // Chiusura chiesta dall'utente: il movimento inverso precede `onClose`.
  const requestClose = useCallback(() => {
    if (prefersReducedMotion()) {
      onClose();
      return;
    }
    Animated.spring(enter, sheetSpring(0)).start(({ finished }) => {
      if (finished) onClose();
    });
  }, [enter, onClose]);

  return {
    /** Il Modal resta montato finché l'uscita non è finita. */
    mounted,
    requestClose,
    fade: enter.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
    translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }),
    scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }),
  };
}

/**
 * Assistente AI legato a un esercizio: la funzione server aggiunge
 * automaticamente esercizio corrente, serie prescritte, ultime esecuzioni,
 * feedback precedenti e recupero. L'atleta scrive (o sceglie) la domanda.
 *
 * Anatomia "Glass Over Iron": il guscio è VETRO (maniglia, testata, composer),
 * la risposta del coach vive su FERRO opaco — un paragrafo non poggia mai su
 * una superficie sfocata.
 */
export function AiCoachSheet({ visible, exerciseId, workoutExerciseId, exerciseName, coachClientId, onClose }: Props) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const wellMaxHeight = Math.round(height * 0.46);
  // Il foglio entra ed esce a molla: niente scivolata lineare di sistema.
  const { mounted, requestClose, fade, translateY, scale } = useSheetEnter(visible, onClose);

  useEffect(() => {
    if (visible) {
      setQuestion('');
      setAnswer(null);
      setError(null);
    }
  }, [visible]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-coach', {
        body: { question: q, coachClientId, exerciseId, workoutExerciseId },
      });
      if (fnError) {
        setError('Il coach AI non è ancora attivo (va abilitato sul server). Riprova più tardi.');
        return;
      }
      const res = data as { answer?: string; error?: string } | null;
      if (res?.error) setError(res.error);
      else setAnswer(res?.answer ?? 'Nessuna risposta.');
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={requestClose}>
      <View style={styles.overlay}>
        {/* Il vuoto dietro il foglio: si accende e si spegne in dissolvenza. */}
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable style={styles.backdropHit} onPress={requestClose} accessibilityLabel="Chiudi il foglio" />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View style={{ transform: [{ translateY }, { scale }] }}>
            <GlassSurface
              cornerRadius={radius.xl}
              lift="sheet"
              padding={spacing.lg}
              style={[styles.sheet, { marginBottom: Math.max(insets.bottom, spacing.md) }]}
            >
              <View style={styles.handle} />

              {/* VETRO — testata: l'identità viola dice chi risponde. */}
              <View style={styles.head}>
                <View style={styles.mark}>
                  <Ionicons name="sparkles" size={20} color={colors.violet} />
                </View>
                <View style={styles.headText}>
                  <Text style={[type.label, styles.eyebrow]}>Coach AI</Text>
                  <Text style={type.title} numberOfLines={2}>
                    {exerciseName}
                  </Text>
                </View>
                <Press onPress={requestClose} style={styles.glassBtn} accessibilityLabel="Chiudi il coach AI">
                  <Ionicons name="close" size={22} color={colors.textPrimary} />
                </Press>
              </View>

              {/* FERRO — tutto ciò che si legge sta qui sopra, opaco. */}
              <ScrollView
                style={[styles.well, { maxHeight: wellMaxHeight }]}
                contentContainerStyle={styles.wellBody}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {answer ? (
                  // Faro unico del foglio: bordo viola attorno alla risposta appena generata.
                  <View style={styles.answer}>
                    <View style={styles.answerHead}>
                      <Ionicons name="sparkles" size={15} color={colors.violet} />
                      <Text style={[type.label, styles.eyebrow]}>Risposta del coach AI</Text>
                    </View>
                    <Text style={type.body}>{answer}</Text>
                  </View>
                ) : loading ? (
                  <View style={styles.thinking}>
                    <ActivityIndicator color={colors.violet} />
                    <Text style={[type.body, styles.thinkingText]}>Il coach sta pensando…</Text>
                  </View>
                ) : (
                  <>
                    <Text style={type.label}>Domande frequenti</Text>
                    <View style={styles.chips}>
                      {SUGGESTIONS.map((s) => (
                        <Press
                          key={s}
                          onPress={() => ask(s)}
                          scaleTo={0.98}
                          style={styles.chip}
                          accessibilityLabel={s}
                        >
                          <Text style={[type.body, styles.chipText]}>{s}</Text>
                          <Ionicons name="arrow-forward" size={18} color={colors.violet} />
                        </Press>
                      ))}
                    </View>
                  </>
                )}

                {error ? (
                  <View style={styles.error}>
                    <Ionicons name="alert-circle" size={20} color={colors.rose} />
                    <Text style={[type.body, styles.errorText]}>{error}</Text>
                  </View>
                ) : null}

                <View style={styles.disclaimer}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
                  <Text style={styles.disclaimerText}>
                    L'AI è un supporto: per dolori o infortuni parla sempre col tuo coach o un medico.
                  </Text>
                </View>
              </ScrollView>

              {/* VETRO — composer: il campo resta opaco, così si legge mentre scrivi. */}
              <View style={styles.foot}>
                <TextInput
                  style={[sharedStyles.input, styles.input]}
                  value={question}
                  onChangeText={setQuestion}
                  placeholder="Scrivi la tua domanda al coach AI…"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                />
                <AskButton
                  label={answer ? 'Chiedi ancora' : 'Chiedi al coach AI'}
                  loading={loading}
                  onPress={() => ask(question)}
                />
              </View>
            </GlassSurface>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Il vuoto: è il contrasto su cui il vetro prende luce.
    backgroundColor: 'rgba(6,8,13,0.74)',
  },
  backdropHit: {
    flex: 1,
  },
  sheet: {
    marginHorizontal: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.24)',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },

  // --- VETRO: testata ---
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(191,90,242,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(191,90,242,0.45)',
  },
  headText: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: colors.violet,
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

  // --- FERRO: il pozzo del contenuto (raggio concentrico 34 − 16) ---
  well: {
    backgroundColor: colors.card,
    borderRadius: concentric(radius.xl, spacing.lg),
    overflow: 'hidden',
  },
  wellBody: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  answer: {
    backgroundColor: colors.raised,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.violet,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  answerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  thinkingText: {
    color: colors.textSecondary,
  },
  chips: {
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    backgroundColor: colors.raised,
    borderRadius: radius.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  chipText: {
    flex: 1,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,55,95,0.10)',
    borderRadius: radius.xs,
    padding: spacing.md,
  },
  errorText: {
    flex: 1,
    color: colors.rose,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  disclaimerText: {
    flex: 1,
    color: colors.textTertiary,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },

  // --- VETRO: composer ---
  foot: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  input: {
    minHeight: 64,
    maxHeight: 132,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  ask: {
    minHeight: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
  },
  askDim: {
    opacity: 0.45,
  },
  askRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  askLabel: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
