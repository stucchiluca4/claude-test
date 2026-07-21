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
} from 'react-native';
import { FEEDBACK_SCALES } from '@wc/shared';
import { colors, radius, spacing, sharedStyles } from '../lib/theme';
import { DotScale } from './DotScale';
import { PrimaryButton } from './PrimaryButton';

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
 * Bottom sheet che raccoglie il feedback dell'atleta su un esercizio:
 * RPE, difficoltà, energia, dolore (scale 1-10) e una nota libera.
 */
export function ExerciseFeedbackModal({ visible, exerciseName, initial, saving, onSave, onClose }: Props) {
  const [rpe, setRpe] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [pain, setPain] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

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
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <ScrollView
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={sharedStyles.sectionLabel}>Com'è andato</Text>
              <Text style={styles.title} numberOfLines={2}>
                {exerciseName}
              </Text>

              <DotScale
                label={FEEDBACK_SCALES.rpe.label}
                emoji={FEEDBACK_SCALES.rpe.emoji}
                bands={FEEDBACK_SCALES.rpe.bands}
                value={rpe}
                onChange={setRpe}
              />
              <DotScale
                label={FEEDBACK_SCALES.difficulty.label}
                emoji={FEEDBACK_SCALES.difficulty.emoji}
                bands={FEEDBACK_SCALES.difficulty.bands}
                value={difficulty}
                onChange={setDifficulty}
              />
              <DotScale
                label={FEEDBACK_SCALES.energy.label}
                emoji={FEEDBACK_SCALES.energy.emoji}
                bands={FEEDBACK_SCALES.energy.bands}
                value={energy}
                onChange={setEnergy}
              />
              <DotScale
                label={FEEDBACK_SCALES.pain.label}
                emoji={FEEDBACK_SCALES.pain.emoji}
                bands={FEEDBACK_SCALES.pain.bands}
                value={pain}
                onChange={setPain}
              />

              <TextInput
                style={[sharedStyles.input, styles.notes]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Nota per il coach (facoltativa): sensazioni, dolori, tecnica…"
                placeholderTextColor={colors.textSecondary}
                multiline
              />

              <PrimaryButton
                label="Salva feedback"
                loading={saving}
                onPress={() => onSave({ rpe, difficulty, energy, pain, notes: notes.trim() })}
              />
              <Pressable onPress={onClose} hitSlop={8} style={styles.skip}>
                <Text style={styles.skipText}>{nothingFilled ? 'Salta' : 'Chiudi senza salvare'}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  notes: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  skip: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
