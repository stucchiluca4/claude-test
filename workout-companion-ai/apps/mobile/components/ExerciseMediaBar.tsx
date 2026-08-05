import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Press } from './Press';
import { colors, concentric, radius, spacing, type } from '../lib/theme';
import { tapMedium } from '../lib/haptics';
import { showError } from '../lib/utils';
import {
  deleteExerciseMedia,
  getExerciseMediaForLog,
  uploadExerciseMedia,
  type ExerciseMediaWithUrl,
} from '../lib/queries';

interface Props {
  clientId: string | null;
  workoutLogId: string;
  workoutExerciseId: string;
  exerciseId: string;
}

/** Lato del riquadro: miniature e zone di aggiunta hanno la stessa misura. */
const TILE = 72;

/**
 * Raggio interno della card dell'esercizio (26 − 16): le miniature restano
 * concentriche con la superficie che le contiene.
 */
const TILE_RADIUS = concentric(radius.lg, spacing.lg);

/** Galleria compatta di foto/video per un esercizio, con aggiunta ed eliminazione. */
export function ExerciseMediaBar({ clientId, workoutLogId, workoutExerciseId, exerciseId }: Props) {
  const [media, setMedia] = useState<ExerciseMediaWithUrl[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const all = await getExerciseMediaForLog(workoutLogId);
      setMedia(all.filter((m) => m.workout_exercise_id === workoutExerciseId));
    } catch (e) {
      showError(e, 'Impossibile caricare gli allegati');
    }
  }, [workoutLogId, workoutExerciseId]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(mediaType: 'photo' | 'video') {
    if (!clientId || busy) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permesso negato', 'Consenti l’accesso a foto/video per allegarli.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType === 'photo' ? ['images'] : ['videos'],
        quality: 0.7,
        videoMaxDuration: 60,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setBusy(true);
      await uploadExerciseMedia({
        clientId,
        workoutLogId,
        workoutExerciseId,
        exerciseId,
        uri: result.assets[0].uri,
        mediaType,
      });
      await load();
    } catch (e) {
      showError(e, 'Caricamento non riuscito');
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(item: ExerciseMediaWithUrl) {
    // Il gesto distruttivo si annuncia con un colpo aptico prima della richiesta.
    tapMedium();
    Alert.alert('Eliminare l’allegato?', 'L’azione non è reversibile.', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            await deleteExerciseMedia(item);
            await load();
          } catch (e) {
            showError(e, 'Eliminazione non riuscita');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.tiles}>
        {/* FERRO: gli allegati sono contenuto, quindi superficie opaca. */}
        {media.map((m) => (
          <Press
            key={m.id}
            style={styles.thumb}
            // Il tocco semplice non fa nulla: nessun colpo aptico a vuoto.
            haptic="none"
            onLongPress={() => confirmDelete(m)}
            accessibilityLabel={
              m.media_type === 'photo'
                ? 'Foto allegata. Tieni premuto per eliminarla.'
                : 'Video allegato. Tieni premuto per eliminarlo.'
            }
          >
            {m.media_type === 'photo' && m.url ? (
              <Image source={{ uri: m.url }} style={styles.image} />
            ) : (
              <View style={styles.videoBox}>
                <Ionicons name="videocam" size={26} color={colors.textSecondary} />
                <Text style={type.label}>Video</Text>
              </View>
            )}
          </Press>
        ))}

        {/* Zone di caricamento: l'unico punto del sistema dove il bordo è tratteggiato. */}
        <Press
          style={[styles.addTile, busy && styles.addTileBusy]}
          disabled={busy}
          onPress={() => add('photo')}
          accessibilityLabel="Aggiungi una foto"
        >
          {busy ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={24} color={colors.accent} />
              <Text style={[type.label, styles.addLabel]}>Foto</Text>
            </>
          )}
        </Press>

        <Press
          style={[styles.addTile, busy && styles.addTileBusy]}
          disabled={busy}
          onPress={() => add('video')}
          accessibilityLabel="Aggiungi un video"
        >
          <Ionicons name="videocam-outline" size={24} color={colors.accent} />
          <Text style={[type.label, styles.addLabel]}>Video</Text>
        </Press>
      </View>

      {media.length > 0 ? <Text style={styles.hint}>Tieni premuto un allegato per eliminarlo.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  thumb: {
    width: TILE,
    height: TILE,
    borderRadius: TILE_RADIUS,
    overflow: 'hidden',
    backgroundColor: colors.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  videoBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.raised,
  },
  addTile: {
    width: TILE,
    height: TILE,
    borderRadius: TILE_RADIUS,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(10,132,255,0.45)',
    backgroundColor: 'rgba(10,132,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  addTileBusy: {
    opacity: 0.5,
  },
  addLabel: {
    color: colors.accent,
  },
  hint: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.textTertiary,
  },
});
