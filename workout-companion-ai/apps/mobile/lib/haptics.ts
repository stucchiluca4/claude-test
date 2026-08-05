import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Risposta aptica: ogni conferma importante ha un colpo fisico.
 * Sul web non esiste e viene ignorata in silenzio.
 */
const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

/** Pressione di un comando. */
export function tapLight(): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Gesto importante (avvio timer, apertura foglio). */
export function tapMedium(): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** Serie completata, allenamento chiuso, record battuto. */
export function tapSuccess(): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Qualcosa non è andato: errore di salvataggio, campo mancante. */
export function tapError(): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
