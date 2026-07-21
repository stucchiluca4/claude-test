import { Platform, Vibration } from 'react-native';

/**
 * Segnali dei timer: suono (beep) + vibrazione, senza dipendenze native.
 * - Web (dove si prova su localhost): beep via Web Audio.
 * - Telefono: vibrazione (il beep dedicato arriverà con expo-audio).
 */
export type Cue = 'tick' | 'round' | 'end';

let audioCtx: AudioContext | null = null;

function webBeep(freq: number, durationMs: number): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    audioCtx = audioCtx ?? new AC();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    osc.start(now);
    osc.stop(now + durationMs / 1000);
  } catch {
    // audio non disponibile: ignoriamo
  }
}

function webVibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  try {
    nav.vibrate?.(pattern);
  } catch {
    // vibrazione non supportata: ignoriamo
  }
}

/** Emette il segnale richiesto rispettando le preferenze suono/vibrazione. */
export function playCue(cue: Cue, opts?: { sound?: boolean; vibrate?: boolean }): void {
  const sound = opts?.sound ?? true;
  const vibrate = opts?.vibrate ?? true;

  const freq = cue === 'end' ? 660 : cue === 'round' ? 990 : 880;
  const soundMs = cue === 'end' ? 420 : 150;
  const pattern: number | number[] =
    cue === 'end' ? [0, 220, 110, 220] : cue === 'round' ? 160 : 60;

  if (sound) webBeep(freq, soundMs);
  if (vibrate) {
    if (Platform.OS === 'web') webVibrate(pattern);
    else Vibration.vibrate(pattern);
  }
}
