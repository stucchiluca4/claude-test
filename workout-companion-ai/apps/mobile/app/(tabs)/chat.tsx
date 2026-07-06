import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CoachClient, Message } from '@wc/shared';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, sharedStyles } from '../../lib/theme';
import { showError } from '../../lib/utils';
import { getActiveCoachClient, getUserId } from '../../lib/queries';

export default function ChatScreen() {
  const [uid, setUid] = useState<string | null>(null);
  const [coachClient, setCoachClient] = useState<CoachClient | null>(null);
  const [convId, setConvId] = useState<string | null>(null);
  // Lista in ordine inverso (più recente in testa) per la FlatList inverted.
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;
      setUid(userId);

      const cc = await getActiveCoachClient(userId);
      setCoachClient(cc);
      if (!cc) return;

      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('coach_client_id', cc.id)
        .maybeSingle();
      if (convError) throw new Error(convError.message);
      if (!conv) return;

      const conversationId = (conv as { id: string }).id;
      setConvId(conversationId);

      const { data: msgs, error: msgsError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (msgsError) throw new Error(msgsError.message);
      setMessages((msgs ?? []) as Message[]);
    } catch (e) {
      showError(e, 'Errore di caricamento');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: i nuovi messaggi (anche del coach) arrivano senza refresh.
  useEffect(() => {
    if (!convId) return;
    const channel = supabase
      .channel(`messages-${convId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [msg, ...prev]));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [convId]);

  async function send() {
    const body = text.trim();
    if (!body || !uid || !coachClient || sending) return;
    setSending(true);
    try {
      // La conversazione viene creata al primo messaggio, se non esiste.
      let conversationId = convId;
      if (!conversationId) {
        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .insert({ coach_client_id: coachClient.id })
          .select('id')
          .single();
        if (convError) throw new Error(convError.message);
        conversationId = (conv as { id: string }).id;
        setConvId(conversationId);
      }

      const { data: msg, error } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: uid, body })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      const sent = msg as Message;
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [sent, ...prev]));
      setText('');
    } catch (e) {
      showError(e, 'Invio non riuscito');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={sharedStyles.screen} edges={['top']}>
        <View style={sharedStyles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={sharedStyles.muted}>Apro la chat…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!coachClient) {
    return (
      <SafeAreaView style={sharedStyles.screen} edges={['top']}>
        <View style={styles.header}>
          <Text style={sharedStyles.screenTitle}>Chat</Text>
        </View>
        <View style={sharedStyles.center}>
          <Text style={sharedStyles.body}>
            Non sei ancora collegato a un coach: appena lo sarai potrai scrivergli da qui.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={sharedStyles.screen} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <Text style={sharedStyles.screenTitle}>Chat</Text>
          <Text style={sharedStyles.muted}>Il tuo coach ti risponde qui</Text>
        </View>

        <FlatList
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              {/* Con inverted anche l'empty state risulta capovolto: lo raddrizziamo. */}
              <Text style={[sharedStyles.muted, styles.flipped]}>
                Nessun messaggio ancora: rompi il ghiaccio con il tuo coach!
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const mine = item.sender_id === uid;
            return (
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleCoach]}>
                <Text style={styles.bubbleText}>{item.body ?? ''}</Text>
                <Text style={styles.bubbleTime}>
                  {new Date(item.created_at).toLocaleTimeString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            );
          }}
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Scrivi un messaggio…"
            placeholderTextColor={colors.textSecondary}
            multiline
          />
          <Pressable
            style={[styles.sendButton, (!text.trim() || sending) && styles.sendDisabled]}
            onPress={send}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Text style={styles.sendLabel}>Invia</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.sm,
    flexGrow: 1,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipped: {
    transform: [{ scaleY: -1 }],
    textAlign: 'center',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 2,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
    borderBottomRightRadius: radius.sm,
  },
  bubbleCoach: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: radius.sm,
  },
  bubbleText: {
    color: colors.textPrimary,
    fontSize: 15,
  },
  bubbleTime: {
    color: 'rgba(249, 250, 251, 0.6)',
    fontSize: 10,
    alignSelf: 'flex-end',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.5,
  },
  sendLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
