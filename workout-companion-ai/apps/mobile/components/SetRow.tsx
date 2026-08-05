import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { SET_TYPES } from '@wc/shared';
import type { ExerciseSet } from '@wc/shared';
import { colors, concentric, radius, spacing, tabular } from '../lib/theme';
import { Press } from './Press';

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
  return parts.join(' ') || 'serie libera';
}

/**
 * Il componente più usato del prodotto, progettato per il caso peggiore:
 * mani sudate e sguardo di tre secondi. Prescrizione sopra, campi grandi in
 * cifre tabulari sotto, bersaglio da 48pt per confermare (DESIGN.md § Set Row).
 */
export function SetRow({ set, entry, saving, onChange, onToggle }: Props) {
  const done = entry.completed;

  return (
    <View style={[styles.row, done && styles.rowDone]}>
      <View style={styles.head}>
        <View style={[styles.index, done && styles.indexDone]}>
          <Text style={[styles.indexText, done && styles.indexTextDone]}>{set.set_number}</Text>
        </View>
        <Text style={styles.target} numberOfLines={1}>
          {set.set_type !== 'normal' ? `${SET_TYPES[set.set_type]} · ` : ''}
          {targetText(set)}
        </Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.field}>
          <TextInput
            style={[styles.input, tabular]}
            value={entry.load}
            onChangeText={(v) => onChange('load', v)}
            placeholder="—"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            editable={!done}
            maxLength={6}
            accessibilityLabel={`Carico serie ${set.set_number}`}
          />
          <Text style={styles.unit}>kg</Text>
        </View>

        <Text style={styles.times}>×</Text>

        <View style={styles.field}>
          <TextInput
            style={[styles.input, tabular]}
            value={entry.reps}
            onChangeText={(v) => onChange('reps', v)}
            placeholder="—"
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
            editable={!done}
            maxLength={4}
            accessibilityLabel={`Ripetizioni serie ${set.set_number}`}
          />
          <Text style={styles.unit}>reps</Text>
        </View>

        <View style={styles.fieldSmall}>
          <TextInput
            style={[styles.input, styles.inputSmall, tabular]}
            value={entry.rpe}
            onChangeText={(v) => onChange('rpe', v)}
            placeholder="—"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            editable={!done}
            maxLength={4}
            accessibilityLabel={`RPE serie ${set.set_number}`}
          />
          <Text style={styles.unit}>rpe</Text>
        </View>

        <Press
          onPress={onToggle}
          disabled={saving}
          haptic={done ? 'light' : 'success'}
          style={[styles.check, done && styles.checkDone]}
          accessibilityLabel={done ? 'Annulla serie completata' : 'Completa serie'}
        >
          {saving ? (
            <ActivityIndicator size="small" color={done ? colors.void : colors.textPrimary} />
          ) : (
            <Text style={[styles.checkMark, done && styles.checkMarkDone]}>✓</Text>
          )}
        </Press>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.raised,
    borderRadius: concentric(radius.lg, spacing.lg),
    padding: spacing.md,
    gap: spacing.sm,
  },
  rowDone: {
    backgroundColor: 'rgba(50,215,75,0.10)',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  index: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexDone: {
    backgroundColor: colors.mint,
  },
  indexText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  indexTextDone: {
    color: colors.void,
  },
  target: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  field: {
    flex: 1,
    alignItems: 'center',
  },
  fieldSmall: {
    width: 52,
    alignItems: 'center',
  },
  input: {
    width: '100%',
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    paddingVertical: 2,
  },
  inputSmall: {
    fontSize: 20,
  },
  unit: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  times: {
    color: colors.textTertiary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  check: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  checkDone: {
    backgroundColor: colors.mint,
    borderColor: colors.mint,
  },
  checkMark: {
    color: colors.textTertiary,
    fontSize: 22,
    fontWeight: '800',
  },
  checkMarkDone: {
    color: colors.void,
  },
});
