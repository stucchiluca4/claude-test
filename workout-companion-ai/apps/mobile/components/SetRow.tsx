import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SET_TYPES } from '@wc/shared';
import type { ExerciseSet } from '@wc/shared';
import { colors, radius, spacing } from '../lib/theme';

export interface SetEntry {
  load: string;
  reps: string;
  rpe: string;
  completed: boolean;
}

interface Props {
  set: ExerciseSet;
  entry: SetEntry;
  saving?: boolean;
  onChange: (field: 'load' | 'reps' | 'rpe', value: string) => void;
  onToggle: () => void;
}

/** Testo della prescrizione, es. "8-10 reps @RPE 8". */
function targetText(set: ExerciseSet): string {
  const parts: string[] = [];
  if (set.reps_min != null && set.reps_max != null && set.reps_min !== set.reps_max) {
    parts.push(`${set.reps_min}-${set.reps_max} reps`);
  } else if (set.reps_max != null || set.reps_min != null) {
    parts.push(`${set.reps_max ?? set.reps_min} reps`);
  }
  if (set.target_rpe != null) parts.push(`@RPE ${set.target_rpe}`);
  return parts.join(' ') || 'libera';
}

export function SetRow({ set, entry, saving, onChange, onToggle }: Props) {
  return (
    <View style={[styles.row, entry.completed && styles.rowDone]}>
      <View style={styles.setInfo}>
        <Text style={styles.setNumber}>{set.set_number}</Text>
        <Text style={styles.target} numberOfLines={2}>
          {set.set_type !== 'normal' ? `${SET_TYPES[set.set_type]} · ` : ''}
          {targetText(set)}
        </Text>
      </View>

      <TextInput
        style={styles.input}
        value={entry.load}
        onChangeText={(v) => onChange('load', v)}
        placeholder="kg"
        placeholderTextColor={colors.textSecondary}
        keyboardType="decimal-pad"
        editable={!entry.completed}
        maxLength={6}
      />
      <TextInput
        style={styles.input}
        value={entry.reps}
        onChangeText={(v) => onChange('reps', v)}
        placeholder="reps"
        placeholderTextColor={colors.textSecondary}
        keyboardType="number-pad"
        editable={!entry.completed}
        maxLength={4}
      />
      <TextInput
        style={styles.input}
        value={entry.rpe}
        onChangeText={(v) => onChange('rpe', v)}
        placeholder="rpe"
        placeholderTextColor={colors.textSecondary}
        keyboardType="decimal-pad"
        editable={!entry.completed}
        maxLength={4}
      />

      <Pressable
        onPress={onToggle}
        disabled={saving}
        style={[styles.check, entry.completed && styles.checkDone]}
        hitSlop={8}
      >
        {saving ? (
          <ActivityIndicator size="small" color={colors.textPrimary} />
        ) : (
          <Text style={styles.checkMark}>✓</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowDone: {
    opacity: 0.75,
  },
  setInfo: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  setNumber: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '800',
    width: 18,
    textAlign: 'center',
  },
  target: {
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  input: {
    flex: 0.8,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.textPrimary,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  check: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkMark: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
});
