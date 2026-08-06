import { Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, glass, radius, wash } from '../../lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;

/** Altezza utile della barra, safe-area esclusa. */
const BAR_HEIGHT = 62;

/**
 * Icona di scheda: contorno a riposo, piena quando attiva (convenzione iOS).
 * La scheda attiva riceve la PASTIGLIA di sfondo prevista dal sistema
 * (DESIGN.md § Navigation), che è anche il bersaglio visivo del dito.
 */
function TabIcon({ name, color, focused }: { name: string; color: ColorValue; focused: boolean }) {
  const icon = (focused ? name : `${name}-outline`) as IconName;
  return (
    <View style={[styles.slot, focused && styles.slotActive]}>
      <Ionicons name={icon} size={21} color={color as string} />
    </View>
  );
}

/** Il fondo in VETRO della barra: sfocatura, tinta, luce speculare, bordo capello. */
function GlassTabBar() {
  return (
    <View style={styles.glass}>
      <BlurView intensity={glass.intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: glass.tint }]} />
      <LinearGradient
        colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
        style={styles.sheen}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[...glass.edge]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.specular}
        pointerEvents="none"
      />
      {/* Rifrazione sul bordo basso: il vetro raccoglie luce anche da sotto */}
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.10)']}
        style={styles.refraction}
        pointerEvents="none"
      />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // La barra galleggia sopra la safe area, senza mai toccarne il bordo.
  const lift = Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarBackground: GlassTabBar,
        tabBarStyle: {
          position: 'absolute',
          left: 10,
          right: 10,
          bottom: lift,
          height: BAR_HEIGHT,
          // Il contenuto interno si posiziona da solo: niente padding che
          // schiacci l'etichetta contro il bordo inferiore.
          paddingTop: 6,
          paddingBottom: 6,
          paddingHorizontal: 2,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          // Tracking a zero: con sei voci ogni punto di larghezza conta.
          letterSpacing: 0,
          marginTop: 3,
        },
        tabBarIconStyle: {
          height: 30,
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
          paddingVertical: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Oggi',
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="allenamento"
        options={{
          title: 'Scheda',
          tabBarIcon: ({ color, focused }) => <TabIcon name="barbell" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="nutrizione"
        options={{
          title: 'Nutrizione',
          tabBarIcon: ({ color, focused }) => <TabIcon name="restaurant" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="progressi"
        options={{
          title: 'Progressi',
          tabBarIcon: ({ color, focused }) => <TabIcon name="stats-chart" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => <TabIcon name="chatbubble" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profilo"
        options={{
          title: 'Profilo',
          tabBarIcon: ({ color, focused }) => <TabIcon name="person" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  glass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
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
    height: 8,
  },
  /** Alloggiamento dell'icona: a riposo è invisibile, da attivo diventa pastiglia. */
  slot: {
    minWidth: 46,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotActive: {
    backgroundColor: wash(colors.accent, 0.18),
  },
});
