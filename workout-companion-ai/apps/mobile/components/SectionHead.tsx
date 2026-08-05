import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, type, wash } from '../lib/theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  /** Segnale della sezione: tinge l'icona e, al 12%, il velo che le sta dietro. */
  tint?: string;
  /** Riga di supporto facoltativa sotto il titolo. */
  subtitle?: string;
}

/**
 * Testata di sezione su FERRO: icona del segnale + etichetta.
 * Il colore non viaggia mai da solo — l'icona è la seconda indicazione.
 * Sorgente unica: ogni schermata usa questa, nessuna copia locale.
 */
export function SectionHead({ icon, title, tint = colors.textSecondary, subtitle }: Props) {
  return (
    <View style={styles.head}>
      <View style={[styles.icon, { backgroundColor: wash(tint, 0.12) }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={styles.text}>
        <Text style={type.label}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  subtitle: {
    ...type.muted,
  },
});
