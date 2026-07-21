/**
 * Livello di integrazione SALUTE modulare.
 * L'idea: nuovi provider (Apple Health, Google Fit, WHOOP, Garmin…) si
 * REGISTRANO in un registro comune, senza modificare il codice esistente.
 * La connessione nativa richiede una build dell'app (non Expo Go).
 */

export type HealthSource =
  | 'apple_health'
  | 'google_fit'
  | 'health_connect'
  | 'whoop'
  | 'garmin'
  | 'fitbit'
  | 'withings'
  | 'oura'
  | 'samsung_health'
  | 'polar'
  | 'coros'
  | 'strava'
  | 'manual';

export type HealthMetricKind =
  | 'sleep_hours'
  | 'sleep_quality'
  | 'hrv'
  | 'recovery'
  | 'heart_rate'
  | 'resting_hr'
  | 'weight'
  | 'body_fat'
  | 'lean_mass'
  | 'vo2max'
  | 'stress'
  | 'calories'
  | 'temperature'
  | 'spo2'
  | 'steps';

export interface HealthSample {
  source: HealthSource;
  metric: HealthMetricKind;
  value: number;
  unit: string;
  measured_at: string; // ISO
}

export interface HealthProviderMeta {
  id: HealthSource;
  label: string;
  emoji: string;
  /** os = SDK del sistema; oauth = collegamento web; manual = inserito a mano. */
  kind: 'os' | 'oauth' | 'manual';
  platform?: 'ios' | 'android' | 'both';
  /** true se già utilizzabile con questa build dell'app. */
  available: boolean;
}

/** Elenco dei provider supportati (metadati per la UI). */
export const HEALTH_PROVIDERS: HealthProviderMeta[] = [
  { id: 'manual', label: 'Inserimento manuale', emoji: '✍️', kind: 'manual', platform: 'both', available: true },
  { id: 'apple_health', label: 'Apple Health', emoji: '', kind: 'os', platform: 'ios', available: false },
  { id: 'health_connect', label: 'Google Health Connect', emoji: '🟢', kind: 'os', platform: 'android', available: false },
  { id: 'google_fit', label: 'Google Fit', emoji: '🏃', kind: 'oauth', platform: 'both', available: false },
  { id: 'whoop', label: 'WHOOP', emoji: '🔴', kind: 'oauth', platform: 'both', available: false },
  { id: 'garmin', label: 'Garmin Connect', emoji: '⌚', kind: 'oauth', platform: 'both', available: false },
  { id: 'fitbit', label: 'Fitbit', emoji: '💙', kind: 'oauth', platform: 'both', available: false },
  { id: 'oura', label: 'Oura', emoji: '💍', kind: 'oauth', platform: 'both', available: false },
  { id: 'withings', label: 'Withings', emoji: '⚖️', kind: 'oauth', platform: 'both', available: false },
  { id: 'samsung_health', label: 'Samsung Health', emoji: '📱', kind: 'os', platform: 'android', available: false },
  { id: 'polar', label: 'Polar', emoji: '❄️', kind: 'oauth', platform: 'both', available: false },
  { id: 'coros', label: 'COROS', emoji: '🧭', kind: 'oauth', platform: 'both', available: false },
  { id: 'strava', label: 'Strava', emoji: '🧡', kind: 'oauth', platform: 'both', available: false },
];

/**
 * Contratto che ogni provider deve implementare. Aggiungere un provider
 * significa creare un oggetto che rispetta questa interfaccia e registrarlo:
 * NESSUNA modifica al codice che consuma i dati.
 */
export interface HealthProvider {
  id: HealthSource;
  /** Avvia il collegamento (permessi OS o OAuth). Ritorna true se collegato. */
  connect(): Promise<boolean>;
  /** Scarica i campioni disponibili nell'intervallo. */
  sync(range: { from: string; to: string }): Promise<HealthSample[]>;
}

const registry = new Map<HealthSource, HealthProvider>();

/** Registra un provider (idempotente per id). */
export function registerHealthProvider(provider: HealthProvider): void {
  registry.set(provider.id, provider);
}

export function getHealthProvider(id: HealthSource): HealthProvider | undefined {
  return registry.get(id);
}

export function isProviderConnectable(id: HealthSource): boolean {
  return registry.has(id);
}

/** Campi di `daily_biofeedback` derivabili dai campioni salute (gli altri vanno in health_metrics). */
export interface BiofeedbackFromHealth {
  steps?: number;
  sleep_hours?: number;
  sleep_quality?: number;
  weight_kg?: number;
  recovery?: number;
  stress_level?: number;
}

/** Normalizza i campioni salute nei campi del biofeedback giornaliero. */
export function mapMetricsToBiofeedback(samples: HealthSample[]): BiofeedbackFromHealth {
  const out: BiofeedbackFromHealth = {};
  for (const s of samples) {
    switch (s.metric) {
      case 'steps':
        out.steps = Math.round(s.value);
        break;
      case 'sleep_hours':
        out.sleep_hours = Math.round(s.value * 10) / 10;
        break;
      case 'sleep_quality':
        out.sleep_quality = Math.round(s.value);
        break;
      case 'weight':
        out.weight_kg = Math.round(s.value * 10) / 10;
        break;
      case 'recovery':
        out.recovery = Math.round(s.value);
        break;
      case 'stress':
        out.stress_level = Math.round(s.value);
        break;
      default:
        break;
    }
  }
  return out;
}
