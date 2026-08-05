import { useEffect, useState } from 'react';
import {
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
import { FEEDBACK_SCALES } from '@wc/shared';
import { colors, concentric, radius, spacing, sharedStyles, type } from '../lib/theme';
import { DotScale } from './DotScale';
import { GlassSurface } from './Glass';
import { Press } from './Press';
import { PrimaryButton } from './PrimaryButton';

type IconName = keyof typeof Ionicons.glyphMap;

export interface ExerciseFeedbackValues {
  rpe: number | null;
  difficulty: number | null;
  energy: number | null;
  pain: number | null;
  notes: string;
}

interface Props {
  visible: boolean;
  exerciseName: string;
  /** Valori già salvati per questo esercizio, se stai modificando. */
  initial?: Partial<ExerciseFeedbackValues>;
  saving?: boolean;
  onSave: (values: ExerciseFeedbackValues) => void;
  onClose: () => void;
}

/**
 * Riga di una scala: pastiglia con l'icona del segnale + scala 1-10.
 * Il colore non viaggia mai da solo: icona ed etichetta lo raddoppiano.
 */
function ScaleRow({
  icon,
  tint,
  wash,
  label,
  bands,
  value,
  onChange,
}: {
  icon: IconName;
  tint: string;
  wash: string;
  label: string;
  bands: readonly [string, string, string];
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.scaleRow}>
      <View style={[styles.scaleIcon, { backgroundColor: wash }]}>
        <Ionicons name={icon} size={17} color={tint} />
      </View>
      <View style={styles.scaleBody}>
        <DotScale label={label} bands={bands} value={value} onChange={onChange} tint={tint} />
      </View>
    </View>
  );
}

/**
 * Foglio che raccoglie il feedback dell'atleta su un esercizio: RPE,
 * difficoltà, energia, dolore (scale 1-10) e una nota libera.
 *
 * Anatomia "Glass Over Iron": il guscio è VETRO (maniglia, testata, barra
 * d'azione), il pozzo centrale è FERRO opaco perché è lì che si legge e si
 * scrive. Ogni scala porta il proprio segnale: ambra = sforzo, menta = energia,
 * rosa = dolore.
 */
export function ExerciseFeedbackModal({ visible, exerciseName, initial, saving, onSave, onClose }: Props) {
  const [rpe, setRpe] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [pain, setPain] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Il pozzo di ferro scorre: il foglio non supera mai i due terzi dello schermo.
  const wellMaxHeight = Math.round(height * 0.52);

  // Ogni apertura ricarica i valori già salvati (o parte pulita).
  useEffect(() => {
    if (!visible) return;
    setRpe(initial?.rpe ?? null);
    setDifficulty(initial?.difficulty ?? null);
    setEnergy(initial?.energy ?? null);
    setPain(initial?.pain ?? null);
    setNotes(initial?.notes ?? '');
  }, [visible, initial]);

  const nothingFilled =
    rpe == null && difficulty == null && energy == null && pain == null && notes.trim() === '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Chiudi il foglio" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <GlassSurface
            cornerRadius={radius.xl}
            lift="sheet"
            padding={spacing.lg}
            style={[styles.sheet, { marginBottom: Math.max(insets.bottom, spacing.md) }]}
          >
            <View style={styles.handle} />

            {/* VETRO — testata: solo comandi e un titolo corto. */}
            <View style={styles.head}>
              <View style={styles.headText}>
                <Text style={type.label}>Com'è andato</Text>
                <Text style={type.title} numberOfLines={2}>
                  {exerciseName}
                </Text>
              </View>
              <Press
                onPress={onClose}
                style={styles.glassBtn}
                accessibilityLabel="Chiudi senza salvare"
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </Press>
            </View>

            {/* FERRO — qui si legge e si tocca: superficie opaca, mai velata. */}
            <ScrollView
              style={[styles.well, { maxHeight: wellMaxHeight }]}
              contentContainerStyle={styles.wellBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <ScaleRow
                icon="flame"
                tint={colors.amber}
                wash="rgba(255,159,10,0.14)"
                label={FEEDBACK_SCALES.rpe.label}
                bands={FEEDBACK_SCALES.rpe.bands}
                value={rpe}
                onChange={setRpe}
              />
              <ScaleRow
                icon="speedometer"
                tint={colors.amber}
                wash="rgba(255,159,10,0.14)"
                label={FEEDBACK_SCALES.difficulty.label}
                bands={FEEDBACK_SCALES.difficulty.bands}
                value={difficulty}
                onChange={setDifficulty}
              />
              <ScaleRow
                icon="flash"
                tint={colors.mint}
                wash="rgba(50,215,75,0.14)"
                label={FEEDBACK_SCALES.energy.label}
                bands={FEEDBACK_SCALES.energy.bands}
                value={energy}
                onChange={setEnergy}
              />
              <ScaleRow
                icon="bandage"
                tint={colors.rose}
                wash="rgba(255,55,95,0.14)"
                label={FEEDBACK_SCALES.pain.label}
                bands={FEEDBACK_SCALES.pain.bands}
                value={pain}
                onChange={setPain}
              />

              <View style={styles.hair} />

              <View style={styles.notesBlock}>
                <Text style={type.label}>Nota per il coach</Text>
                <TextInput
                  style={[sharedStyles.input, styles.notes]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Facoltativa: sensazioni, dolori, tecnica…"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                />
              </View>
            </ScrollView>

            {/* VETRO — barra d'azione, sempre sotto il pollice. */}
            <View style={styles.foot}>
              <PrimaryButton
                label="Salva feedback"
                loading={saving}
                onPress={() => onSave({ rpe, difficulty, energy, pain, notes: notes.trim() })}
              />
              <Press onPress={onClose} style={styles.skip} accessibilityLabel="Chiudi il foglio">
                <Text style={styles.skipText}>{nothingFilled ? 'Salta' : 'Chiudi senza salvare'}</Text>
              </Press>
            </View>
          </GlassSurface>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    // Il vuoto: è il contrasto su cui il vetro prende luce.
    backgroundColor: 'rgba(6,8,13,0.74)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  headText: {
    flex: 1,
    gap: 2,
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
    gap: spacing.xl,
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  scaleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    // Allinea la pastiglia alla riga dell'etichetta della scala.
    marginTop: -4,
  },
  scaleBody: {
    flex: 1,
  },
  hair: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  notesBlock: {
    gap: spacing.sm,
  },
  notes: {
    borderRadius: radius.xs,
    minHeight: 88,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },

  // --- VETRO: barra d'azione ---
  foot: {
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  skip: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
