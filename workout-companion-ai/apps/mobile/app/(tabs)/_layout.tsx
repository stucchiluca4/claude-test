import { Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, glass, radius } from '../../lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;

/** Icona di scheda: contorno a riposo, piena quando attiva (convenzione iOS). */
function TabIcon({ name, color, focused }: { name: string; color: ColorValue; focused: boolean }) {
  const icon = (focused ? name : `${name}-outline`) as IconName;
  return <Ionicons name={icon} size={25} color={color as string} />;
}

/** Il fondo in VETRO della barra: sfocatura, tinta, luce speculare, bordo capello. */
function GlassTabBar() {
  return (
    <View style={styles.glass}>
      <BlurView intensity={glass.intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: glass.tint }]} />
      <LinearGradient
        colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']}
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
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarBackground: GlassTabBar,
        tabBarStyle: {
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: Math.max(insets.bottom, 12),
          height: 66,
          paddingTop: 8,
          paddingBottom: 8,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.2,
          marginTop: 1,
        },
        tabBarItemStyle: {
          borderRadius: radius.md,
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
});
