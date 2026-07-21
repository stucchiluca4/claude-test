import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius, spacing } from '../lib/theme';
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
      <View style={styles.thumbs}>
        {media.map((m) => (
          <Pressable key={m.id} onLongPress={() => confirmDelete(m)} style={styles.thumb}>
            {m.media_type === 'photo' && m.url ? (
              <Image source={{ uri: m.url }} style={styles.image} />
            ) : (
              <View style={styles.videoBox}>
                <Text style={styles.videoIcon}>▶</Text>
                <Text style={styles.videoLabel}>Video</Text>
              </View>
            )}
          </Pressable>
        ))}
        <Pressable style={[styles.addBtn, busy && styles.addBtnBusy]} disabled={busy} onPress={() => add('photo')}>
          {busy ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.addBtnText}>＋ 📷</Text>}
        </Pressable>
        <Pressable style={[styles.addBtn, busy && styles.addBtnBusy]} disabled={busy} onPress={() => add('video')}>
          <Text style={styles.addBtnText}>＋ 🎥</Text>
        </Pressable>
      </View>
      {media.length > 0 ? <Text style={styles.hint}>Tieni premuto un allegato per eliminarlo.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  thumbs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
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
    backgroundColor: colors.background,
    gap: 2,
  },
  videoIcon: {
    color: colors.accent,
    fontSize: 20,
  },
  videoLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  addBtn: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56,189,248,0.06)',
  },
  addBtnBusy: {
    opacity: 0.6,
  },
  addBtnText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 11,
  },
});
