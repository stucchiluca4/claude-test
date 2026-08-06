import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, spacing, type } from '../lib/theme';

interface Props {
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Colore del faro: solo per l'UNICO elemento a fuoco della schermata. */
  beacon?: string;
}

/**
 * Superficie del livello FERRO: opaca, senza ombra, si stacca dal fondo per
 * tono e per una luce capello sul bordo alto. Qui vive tutto ciò che si legge.
 */
export function Card({ title, children, style, beacon }: Props) {
  return (
    <View
      style={[
        styles.card,
        beacon ? { borderColor: beacon, borderWidth: 1 } : null,
        style,
      ]}
    >
      <View style={styles.topLight} pointerEvents="none" />
      {title ? <Text style={[type.label, styles.title]}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // Ferro al 92%: opaco quanto basta per la lettura, ma il campo luminoso
    // sottostante lo tinge appena — la superficie resta viva.
    backgroundColor: 'rgba(21,26,36,0.92)',
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    overflow: 'hidden',
  },
  topLight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    marginBottom: spacing.xs,
  },
});
