import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, glass, radius, shadow } from '../lib/theme';

interface Props {
  children: ReactNode;
  /** Raggio della forma. Pillola per i comandi, 34 per barre e fogli. */
  cornerRadius?: number;
  padding?: number;
  style?: StyleProp<ViewStyle>;
  /** Ombra che stacca il vetro dal contenuto sottostante. */
  lift?: 'glass' | 'sheet' | 'none';
  /**
   * Quanto contenuto sta passando sotto il vetro (0 = nulla, 1 = molto).
   * Il materiale si "accende" solo quando qualcosa lo attraversa, come su iOS.
   */
  activity?: number;
}

/**
 * Il mattone del livello VETRO (DESIGN.md § Elevation & Depth).
 *
 * Sfocatura nativa + tinta scura + rifrazione sui bordi alto e basso + bordo
 * capello. Porta SOLO controlli: barre schede, testate, fogli, timer, barre
 * d'azione. Mai testo di lettura, grafici o tabelle.
 */
export function GlassSurface({
  children,
  cornerRadius = radius.xl,
  padding = 0,
  style,
  lift = 'glass',
  activity = 0,
}: Props) {
  const liftStyle = lift === 'none' ? null : lift === 'sheet' ? shadow.sheet : shadow.glass;
  const engaged = Math.max(0, Math.min(1, activity));

  return (
    <View style={[liftStyle, { borderRadius: cornerRadius }, style]}>
      <View style={[styles.clip, { borderRadius: cornerRadius }]}>
        <BlurView intensity={glass.intensity + engaged * 18} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: glass.tint, opacity: 0.85 + engaged * 0.15 }]} />

        {/* Bagliore morbido che il vetro raccoglie dall'alto */}
        <LinearGradient
          colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']}
          style={styles.sheen}
          pointerEvents="none"
        />
        {/* Luce speculare sul bordo alto: è ciò che rende il vetro "liquido" */}
        <LinearGradient
          colors={[...glass.edge]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.specular}
          pointerEvents="none"
        />
        {/* Rifrazione sul bordo basso: la luce piega anche da sotto */}
        <LinearGradient
          colors={[...glass.edgeBottom]}
          style={styles.refraction}
          pointerEvents="none"
        />

        <View style={{ padding }}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    backgroundColor: 'transparent',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  specular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
  },
  refraction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 10,
  },
});
