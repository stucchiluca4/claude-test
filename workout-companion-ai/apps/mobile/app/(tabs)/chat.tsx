import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ClientStatus, CoachClient, Message } from '@wc/shared';
import { supabase } from '../../lib/supabase';
import { colors, concentric, radius, spacing, sharedStyles, tabular, type } from '../../lib/theme';
import { showError } from '../../lib/utils';
import { getActiveCoachClient, getUserId } from '../../lib/queries';
import { GlassSurface } from '../../components/Glass';
import { Press } from '../../components/Press';
import { EmptyState, LoadingState } from '../../components/States';

/** Altezza della barra schede in vetro flottante (vedi `(tabs)/_layout`). */
const TAB_BAR_HEIGHT = 66;

/** Messaggi dello stesso mittente entro 5 minuti formano un gruppo. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

/** Stato della relazione col coach: al colore si affianca sempre l'etichetta. */
const STATUS_META: Record<ClientStatus, { label: string; tone: string }> = {
  invited: { label: 'Invito in attesa', tone: colors.textSecondary },
  active: { label: 'Collegato', tone: colors.mint },
  paused: { label: 'Percorso in pausa', tone: colors.amber },
  ended: { label: 'Percorso concluso', tone: colors.textSecondary },
};

/** Stesso giorno di calendario (ora locale). */
function sameDay(a: string, b: string): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
  );
}

/** Separatore di giornata: Oggi, Ieri, oppure la data estesa. */
function dayLabel(iso: string): string {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(iso, now.toISOString())) return 'Oggi';
  if (sameDay(iso, yesterday.toISOString())) return 'Ieri';
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
}

/** Due messaggi consecutivi appartengono allo stesso gruppo? */
function linked(a: Message | undefined, b: Message): boolean {
  if (!a || a.sender_id !== b.sender_id) return false;
  if (!sameDay(a.created_at, b.created_at)) return false;
  return Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) <= GROUP_WINDOW_MS;
}

export default function ChatScreen() {
  const [uid, setUid] = useState<string | null>(null);
  const [coachClient, setCoachClient] = useState<CoachClient | null>(null);
  const [convId, setConvId] = useState<string | null>(null);
  // Lista in ordine inverso (più recente in testa) per la FlatList inverted.
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const insets = useSafeAreaInsets();

  // Ingombro della barra schede flottante: la barra d'invio le resta sopra.
  const tabBarSpace = TAB_BAR_HEIGHT + Math.max(insets.bottom, spacing.md) + spacing.md;

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
    return <LoadingState message="Apro la chat…" />;
  }

  if (!coachClient) {
    return (
      <SafeAreaView style={sharedStyles.screen} edges={['top']}>
        {/* Testata in FERRO: opaca, perché porta l'identità della conversazione. */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="chatbubble-ellipses" size={22} color={colors.textSecondary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Chat</Text>
            <Text style={sharedStyles.muted}>Nessun coach collegato</Text>
          </View>
        </View>
        <View style={[sharedStyles.center, { paddingBottom: tabBarSpace }]}>
          <EmptyState
            emoji="🤝"
            title="Ancora nessun coach"
            message="Appena il tuo coach ti aggiungerà potrai scrivergli da qui: dubbi, sensazioni, aggiustamenti."
          />
        </View>
      </SafeAreaView>
    );
  }

  const status = STATUS_META[coachClient.status];
  const canSend = text.trim().length > 0 && !sending;

  return (
    <SafeAreaView style={sharedStyles.screen} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        // La barra d'invio riserva già lo spazio della barra schede: qui lo
        // restituiamo, così a tastiera aperta il vetro le poggia sopra.
        keyboardVerticalOffset={Platform.OS === 'ios' ? -tabBarSpace : 0}
      >
        {/* Testata in FERRO: chi c'è dall'altra parte e in che stato è. */}
        <View style={styles.header}>
          <View style={[styles.avatar, styles.avatarActive]}>
            <Ionicons name="person" size={22} color={colors.accent} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Il tuo coach</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: status.tone }]} />
              <Text style={sharedStyles.muted}>{status.label}</Text>
            </View>
          </View>
        </View>

        <FlatList
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          ListEmptyComponent={
            // La FlatList inverted raddrizza da sé l'empty state, purché il suo
            // nodo radice accetti la prop `style` (qui una View).
            <View style={styles.emptyBox}>
              <EmptyState
                emoji="💬"
                title="Rompi il ghiaccio"
                message="Nessun messaggio ancora. Scrivi al tuo coach: come stai andando, come ti senti, cosa non torna."
              />
            </View>
          }
          renderItem={({ item, index }) => {
            const mine = item.sender_id === uid;
            // Lista invertita: index+1 è il messaggio più vecchio, index-1 il più recente.
            const older = messages[index + 1];
            const newer = messages[index - 1];
            const startsGroup = !linked(older, item);
            const endsGroup = !linked(newer, item);
            const showDay = !older || !sameDay(older.created_at, item.created_at);

            return (
              <View style={startsGroup ? styles.groupStart : undefined}>
                {showDay ? (
                  <View style={styles.dayRow}>
                    <View style={styles.dayChip}>
                      <Text style={styles.dayText}>{dayLabel(item.created_at)}</Text>
                    </View>
                  </View>
                ) : null}

                <View
                  style={[
                    styles.bubble,
                    mine ? styles.bubbleMine : styles.bubbleCoach,
                    // L'angolo interno si stringe quando il messaggio continua il gruppo.
                    !startsGroup && (mine ? styles.stackedMine : styles.stackedCoach),
                  ]}
                >
                  <Text style={styles.bubbleText}>{item.body ?? ''}</Text>
                  {endsGroup ? (
                    <View style={styles.metaRow}>
                      <Text style={[styles.bubbleTime, mine ? styles.timeMine : styles.timeCoach]}>
                        {new Date(item.created_at).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      {mine ? (
                        <Ionicons
                          name={item.status === 'read' ? 'checkmark-done' : 'checkmark'}
                          size={14}
                          color="rgba(255,255,255,0.75)"
                        />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </View>
            );
          }}
        />

        {/* VETRO — barra d'invio ancorata: è un controllo, non contenuto. */}
        <View style={[styles.inputAnchor, { paddingBottom: tabBarSpace }]}>
          <GlassSurface cornerRadius={radius.xl} padding={spacing.md}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder="Scrivi un messaggio…"
                placeholderTextColor={colors.textSecondary}
                multiline
              />
              <Press
                onPress={send}
                disabled={!canSend}
                style={styles.sendWrap}
                accessibilityLabel="Invia messaggio"
              >
                <View style={[styles.send, canSend ? styles.sendOn : styles.sendOff]}>
                  {sending ? (
                    <ActivityIndicator size="small" color={colors.textPrimary} />
                  ) : (
                    <Ionicons
                      name="arrow-up"
                      size={22}
                      color={canSend ? colors.textPrimary : colors.textSecondary}
                    />
                  )}
                </View>
              </Press>
            </View>
          </GlassSurface>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Raggio dei comandi dentro la barra in vetro (regola concentrica). */
const glassInner = concentric(radius.xl, spacing.md);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  // --- FERRO: testata ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActive: {
    backgroundColor: 'rgba(10,132,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(10,132,255,0.35)',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    ...type.title,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },

  // --- FERRO: conversazione ---
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
    flexGrow: 1,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupStart: {
    marginTop: spacing.md,
  },
  dayRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  dayChip: {
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dayText: {
    ...type.label,
    color: colors.textSecondary,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
    borderBottomRightRadius: radius.xs,
  },
  bubbleCoach: {
    alignSelf: 'flex-start',
    backgroundColor: colors.raised,
    borderBottomLeftRadius: radius.xs,
  },
  stackedMine: {
    borderTopRightRadius: radius.xs,
  },
  stackedCoach: {
    borderTopLeftRadius: radius.xs,
  },
  bubbleText: {
    ...type.body,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: spacing.xs,
  },
  bubbleTime: {
    ...type.label,
    ...tabular,
    letterSpacing: 0.2,
    textTransform: 'none',
  },
  timeMine: {
    color: 'rgba(255,255,255,0.75)',
  },
  timeCoach: {
    color: colors.textSecondary,
  },

  // --- VETRO: barra d'invio ---
  inputAnchor: {
    paddingHorizontal: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: glassInner,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 22,
  },
  sendWrap: {
    borderRadius: radius.pill,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOn: {
    backgroundColor: colors.accent,
  },
  sendOff: {
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
});
