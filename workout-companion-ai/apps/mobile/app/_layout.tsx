import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { isDemo } from '../lib/demo';
import { colors, sharedStyles } from '../lib/theme';
import { Aurora } from '../components/Aurora';

export default function RootLayout() {
  // undefined = sessione non ancora letta dallo storage
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Redirect dichiarativo: fuori se sloggato, dentro se loggato.
  useEffect(() => {
    if (isDemo()) return; // in demo non si tocca la navigazione
    if (session === undefined) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, segments, router]);

  if (session === undefined && !isDemo()) {
    // Primo fotogramma dell'app: fondo di ferro e barra di stato chiara,
    // così l'avvio non sfarfalla in bianco prima di mostrare l'accesso.
    return (
      <View style={sharedStyles.screen}>
        <Aurora />
        <View style={sharedStyles.center}>
          <StatusBar style="light" />
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={sharedStyles.screen}>
      {/* Il campo luminoso sta sotto ogni schermata: è ciò che il vetro rifrange. */}
      <Aurora />
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          // Trasparente: le schermate galleggiano sul campo luminoso invece di
          // coprirlo con un fondo pieno.
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'slide_from_right',
          animationDuration: 280,
        }}
      />
    </View>
  );
}
