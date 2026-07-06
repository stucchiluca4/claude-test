/// <reference types="expo/types" />

// Tipi per le variabili d'ambiente pubbliche di Expo.
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
  }
}
