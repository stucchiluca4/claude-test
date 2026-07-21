import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing, sharedStyles } from '../lib/theme';
import { PrimaryButton } from './PrimaryButton';

interface Props {
  visible: boolean;
  exerciseId: string;
  workoutExerciseId: string;
  exerciseName: string;
  coachClientId: string | null;
  onClose: () => void;
}

const SUGGESTIONS = [
  'Mi fa male la spalla durante questo esercizio.',
  'Non riesco a finire le ripetizioni previste.',
  'Posso sostituire questo esercizio con un altro?',
  'Devo aumentare il carico la prossima volta?',
];

/**
 * Assistente AI legato a un esercizio: la funzione server aggiunge
 * automaticamente esercizio corrente, serie prescritte, ultime esecuzioni,
 * feedback precedenti e recupero. L'atleta scrive (o sceglie) la domanda.
 */
export function AiCoachSheet({ visible, exerciseId, workoutExerciseId, exerciseName, coachClientId, onClose }: Props) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setQuestion('');
      setAnswer(null);
      setError(null);
    }
  }, [visible]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-coach', {
        body: { question: q, coachClientId, exerciseId, workoutExerciseId },
      });
      if (fnError) {
        setError('Il coach AI non è ancora attivo (va abilitato sul server). Riprova più tardi.');
        return;
      }
      const res = data as { answer?: string; error?: string } | null;
      if (res?.error) setError(res.error);
      else setAnswer(res?.answer ?? 'Nessuna risposta.');
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              <Text style={sharedStyles.sectionLabel}>🤖 Coach AI</Text>
              <Text style={styles.title} numberOfLines={2}>
                {exerciseName}
              </Text>

              {answer ? (
                <View style={styles.answerBox}>
                  <Text style={sharedStyles.body}>{answer}</Text>
                </View>
              ) : loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color={colors.accent} />
                  <Text style={sharedStyles.muted}>Il coach sta pensando…</Text>
                </View>
              ) : (
                <>
                  <Text style={sharedStyles.muted}>Domande frequenti:</Text>
                  <View style={styles.chips}>
                    {SUGGESTIONS.map((s) => (
                      <Pressable key={s} style={styles.chip} onPress={() => ask(s)}>
                        <Text style={styles.chipText}>{s}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TextInput
                style={[sharedStyles.input, styles.input]}
                value={question}
                onChangeText={setQuestion}
                placeholder="Scrivi la tua domanda al coach AI…"
                placeholderTextColor={colors.textSecondary}
                multiline
              />
              <PrimaryButton
                label={answer ? 'Chiedi ancora' : 'Chiedi al coach AI'}
                loading={loading}
                onPress={() => ask(question)}
              />
              <Text style={styles.disclaimer}>
                L'AI è un supporto: per dolori o infortuni parla sempre col tuo coach o un medico.
              </Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  chips: {
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  chipText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  answerBox: {
    backgroundColor: 'rgba(56,189,248,0.08)',
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  input: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  disclaimer: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
});
