import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { useChatStore } from '../../src/stores/chatStore';
import { ChatBubble, StreamingBubble } from '../../src/components/ChatBubble';
import { StarField } from '../../src/components/StarField';
import { sendChatMessage, ChatMessage } from '../../src/llm/chat';
import {
  requestMicrophonePermission,
  startRecording,
  stopRecording,
  isCurrentlyRecording,
  getMetering,
} from '../../src/audio/recorder';
import { transcribeAudio } from '../../src/audio/transcriber';
import { speakText, stopSpeaking } from '../../src/audio/tts';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { getDatabase, getSqliteDb } from '../../src/db/client';
import { dreams, Dream, chatSessions, appSettings } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { COLORS, FONTS } from '../../src/theme';
import { SETTINGS_KEYS } from '../../src/models/config';
import {
  createSession,
  touchSession,
  saveMessage,
  loadSessionMessages,
  getOpenEndedSessions,
  SessionSummary,
} from '../../src/db/chatHistory';

type VoiceState = 'idle' | 'recording' | 'transcribing';
type ConvPhase = 'listening' | 'transcribing' | 'generating' | 'speaking';

// ─── Dream context helper ─────────────────────────────────────────────────────

function buildPinnedContext(dream: Dream): string {
  const tags: string[] = (() => {
    try { return JSON.parse(dream.tags ?? '[]'); } catch { return []; }
  })();
  const date = new Date(dream.createdAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const MAX_TRANSCRIPT = 500;
  const body = dream.summary
    ? `Summary: ${dream.summary}`
    : `Excerpt: ${dream.transcript.slice(0, MAX_TRANSCRIPT).trim()}${dream.transcript.length > MAX_TRANSCRIPT ? '…' : ''}`;

  return [
    `Title: "${dream.title || 'Untitled Dream'}"`,
    `Recorded: ${date}`,
    dream.mood ? `Mood: ${dream.mood}` : null,
    tags.length ? `Tags: ${tags.join(', ')}` : null,
    body,
  ].filter(Boolean).join('\n');
}

function formatSessionDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Minimum dBFS to count as speech. -40 picks up ambient noise; -28 requires
// clearly audible voice (normal speech: -20 to -5 dBFS).
const SILENCE_DB = -28;
const SILENCE_AFTER_SPEECH_MS = 1200;
// How long audio must stay above SILENCE_DB before we consider it "speech".
// Filters out brief transient noise bursts (coughs, door slams, HVAC spikes).
const MIN_SPEECH_MS = 250;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const {
    messages,
    isGenerating,
    streamingContent,
    addMessage,
    appendStreamToken,
    finalizeStream,
    setIsGenerating,
    clearMessages,
    currentSessionId,
    setCurrentSessionId,
    setMessages,
  } = useChatStore();

  const [inputText, setInputText] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isConversing, setIsConversing] = useState(false);
  const [convPhase, setConvPhase] = useState<ConvPhase>('listening');
  const [focusDream, setFocusDream] = useState<Dream | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [openSessions, setOpenSessions] = useState<SessionSummary[]>([]);
  const [showNux, setShowNux] = useState(false);
  const nuxFade = useRef(new Animated.Value(0)).current;

  const { dreamId: dreamIdParam, sessionId: sessionIdParam } = useLocalSearchParams<{
    dreamId?: string;
    sessionId?: string;
  }>();

  const navigation = useNavigation();
  const currentSessionIdRef = useRef<number | null>(currentSessionId);

  // Keep ref in sync with store
  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  // Update header right whenever focusDream changes
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerButtons}>
          {!focusDream && (
            <Pressable onPress={() => setShowHistory(true)} hitSlop={8}>
              <Text style={styles.headerIcon}>🕐</Text>
            </Pressable>
          )}
          <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
            <Text style={styles.headerIcon}>⚙️</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, focusDream]);

  // Load open-ended sessions when history sheet opens
  useEffect(() => {
    if (showHistory) {
      getOpenEndedSessions().then(setOpenSessions).catch(() => {});
    }
  }, [showHistory]);

  // Show NUX on first visit
  useEffect(() => {
    getDatabase()
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, SETTINGS_KEYS.CHAT_NUX_SEEN))
      .then((rows) => {
        if (!rows.length) {
          setShowNux(true);
          Animated.timing(nuxFade, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();
        }
      })
      .catch(() => {});
  }, []);

  const dismissNux = () => {
    Animated.timing(nuxFade, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setShowNux(false));
    getSqliteDb()
      ?.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [
        SETTINGS_KEYS.CHAT_NUX_SEEN,
        'true',
      ])
      .catch(() => {});
  };

  // Handle session/dream params from navigation
  useEffect(() => {
    if (!sessionIdParam && !dreamIdParam) return;

    (async () => {
      clearMessages();
      setCurrentSessionId(null);
      currentSessionIdRef.current = null;
      setFocusDream(null);

      if (sessionIdParam) {
        const sessionId = parseInt(sessionIdParam, 10);
        try {
          const [session] = await getDatabase()
            .select()
            .from(chatSessions)
            .where(eq(chatSessions.id, sessionId));
          if (!session) return;

          const msgs = await loadSessionMessages(sessionId);
          setMessages(msgs);
          setCurrentSessionId(sessionId);
          currentSessionIdRef.current = sessionId;

          if (session.dreamId) {
            const [dream] = await getDatabase()
              .select()
              .from(dreams)
              .where(eq(dreams.id, session.dreamId));
            if (dream) setFocusDream(dream);
          }
        } catch {
          // session load failed; start fresh
        }
      } else if (dreamIdParam) {
        const dreamId = parseInt(dreamIdParam, 10);
        const [dream] = await getDatabase()
          .select()
          .from(dreams)
          .where(eq(dreams.id, dreamId))
          .catch(() => []);
        if (dream) setFocusDream(dream);

        const sid = await createSession(dreamId);
        setCurrentSessionId(sid);
        currentSessionIdRef.current = sid;
      }
    })();
  }, [sessionIdParam, dreamIdParam]);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const isMountedRef = useRef(true);
  const isConversingRef = useRef(false);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      isConversingRef.current = false;
      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
      stopSpeaking();
      deactivateKeepAwake();
    };
  }, []);

  const pinnedContext = useMemo(
    () => (focusDream ? buildPinnedContext(focusDream) : undefined),
    [focusDream],
  );

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // ─── History sheet actions ─────────────────────────────────────────────────

  const handleLoadSession = async (sessionId: number) => {
    setShowHistory(false);
    clearMessages();
    setCurrentSessionId(null);
    currentSessionIdRef.current = null;
    setFocusDream(null);

    const msgs = await loadSessionMessages(sessionId);
    setMessages(msgs);
    setCurrentSessionId(sessionId);
    currentSessionIdRef.current = sessionId;
  };

  const handleNewChat = () => {
    setShowHistory(false);
    clearMessages();
    setCurrentSessionId(null);
    currentSessionIdRef.current = null;
    setFocusDream(null);
  };

  // ─── Ensure session exists, returns session id ─────────────────────────────

  const ensureSession = async (): Promise<number> => {
    let sid = currentSessionIdRef.current;
    if (sid === null) {
      sid = await createSession();
      setCurrentSessionId(sid);
      currentSessionIdRef.current = sid;
    }
    return sid;
  };

  // ─── Manual send ──────────────────────────────────────────────────────────

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isGenerating || voiceState !== 'idle' || isConversing) return;

    setInputText('');

    const sid = await ensureSession();
    await saveMessage(sid, 'user', text).catch(() => {});

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
    addMessage(userMsg);
    setIsGenerating(true);
    scrollToBottom();

    try {
      await sendChatMessage(
        text,
        messages,
        (token) => { appendStreamToken(token); scrollToBottom(); },
        (response) => {
          finalizeStream(response);
          scrollToBottom();
          const s = currentSessionIdRef.current;
          if (s !== null) {
            saveMessage(s, 'assistant', response).catch(() => {});
            touchSession(s).catch(() => {});
          }
        },
        pinnedContext,
      );
    } catch {
      finalizeStream('Sorry, something went wrong. Please try again.');
    }
  };

  // ─── Manual voice ─────────────────────────────────────────────────────────

  const handleVoicePress = async () => {
    if (speakingId) { await stopSpeaking(); setSpeakingId(null); }

    if (voiceState === 'recording') {
      setVoiceState('transcribing');
      try {
        const result = await stopRecording();
        const transcription = await transcribeAudio(result.uri);
        const text = transcription.text.trim();
        if (text) { setInputText(text); setTimeout(() => inputRef.current?.focus(), 50); }
      } catch {
        Alert.alert('Transcription Failed', 'Could not transcribe your voice. Please try again.');
      } finally {
        setVoiceState('idle');
      }
    } else if (voiceState === 'idle') {
      const granted = await requestMicrophonePermission();
      if (!granted) {
        Alert.alert('Microphone Access', 'Please grant microphone permission to use voice input.', [{ text: 'OK' }]);
        return;
      }
      try {
        await startRecording();
        setVoiceState('recording');
      } catch {
        Alert.alert('Recording Failed', 'Could not start recording.');
      }
    }
  };

  // ─── TTS ──────────────────────────────────────────────────────────────────

  const handleSpeak = useCallback((msg: ChatMessage) => {
    if (speakingId === msg.id) {
      stopSpeaking();
      setSpeakingId(null);
    } else {
      speakText(msg.content, () => setSpeakingId(null));
      setSpeakingId(msg.id);
    }
  }, [speakingId]);

  // ─── Conversation loop ────────────────────────────────────────────────────

  const listenAndTranscribeOnce = (): Promise<string | null> =>
    new Promise((resolve) => {
      if (!isConversingRef.current) { resolve(null); return; }
      setConvPhase('listening');
      setVoiceState('recording');

      startRecording().then(() => {
        let hasSpeech = false;
        let speechSince: number | null = null;  // when audio first crossed threshold
        let silenceSince: number | null = null;

        const iv = setInterval(() => {
          if (!isConversingRef.current) {
            clearInterval(iv); vadIntervalRef.current = null; resolve(null); return;
          }
          const db = getMetering();
          if (db > SILENCE_DB) {
            // Track how long the loud audio has been sustained
            if (!speechSince) speechSince = Date.now();
            if (!hasSpeech && Date.now() - speechSince >= MIN_SPEECH_MS) {
              hasSpeech = true;
            }
            silenceSince = null;
          } else {
            if (!hasSpeech) {
              // Brief spike below threshold before confirming speech — reset clock
              speechSince = null;
            } else {
              if (!silenceSince) { silenceSince = Date.now(); return; }
              if (Date.now() - silenceSince < SILENCE_AFTER_SPEECH_MS) return;
              clearInterval(iv); vadIntervalRef.current = null;
              setConvPhase('transcribing'); setVoiceState('transcribing');
              stopRecording()
                .then((r) => transcribeAudio(r.uri))
                .then((t) => resolve(t.text.trim() || null))
                .catch(() => resolve(null));
            }
          }
        }, 100);

        vadIntervalRef.current = iv;
      }).catch(() => resolve(null));
    });

  const generateResponse = async (text: string): Promise<string> => {
    const sid = await ensureSession();
    await saveMessage(sid, 'user', text).catch(() => {});

    const history = useChatStore.getState().messages;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
    addMessage(userMsg);
    setIsGenerating(true);
    setConvPhase('generating');
    setVoiceState('idle');
    setInputText('');
    scrollToBottom();

    return new Promise((resolve, reject) => {
      sendChatMessage(
        text,
        history,
        (token) => { appendStreamToken(token); scrollToBottom(); },
        (response) => {
          finalizeStream(response);
          scrollToBottom();
          const s = currentSessionIdRef.current;
          if (s !== null) {
            saveMessage(s, 'assistant', response).catch(() => {});
            touchSession(s).catch(() => {});
          }
          resolve(response);
        },
        pinnedContext,
      ).catch(reject);
    });
  };

  const speakAndWait = (text: string): Promise<void> =>
    new Promise((resolve) => {
      if (!isConversingRef.current) { resolve(); return; }
      setConvPhase('speaking');
      const id = `conv_${Date.now()}`;
      setSpeakingId(id);
      speakText(text, () => { setSpeakingId(null); resolve(); });
    });

  const runConversationLoop = async () => {
    while (isConversingRef.current && isMountedRef.current) {
      try {
        const spoken = await listenAndTranscribeOnce();
        if (!spoken || !isConversingRef.current) continue;
        setInputText(spoken);
        const response = await generateResponse(spoken);
        if (!isConversingRef.current) break;
        await speakAndWait(response);
      } catch {
        if (!isConversingRef.current || !isMountedRef.current) break;
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    if (isMountedRef.current) {
      setConvPhase('listening'); setVoiceState('idle'); setInputText('');
    }
  };

  const startConversation = async () => {
    const granted = await requestMicrophonePermission();
    if (!granted) {
      Alert.alert('Microphone Access', 'Please grant microphone permission.', [{ text: 'OK' }]);
      return;
    }
    isConversingRef.current = true;
    setIsConversing(true);
    await activateKeepAwakeAsync();
    runConversationLoop();
  };

  const stopConversation = async () => {
    isConversingRef.current = false;
    // Reset UI state synchronously before the re-render that reveals the normal
    // input row; otherwise voiceState='recording' makes the TextInput non-editable
    // and the mic button show ⏹, leading to a failed stopRecording() call.
    setIsConversing(false);
    setVoiceState('idle');
    setInputText('');
    deactivateKeepAwake();
    if (vadIntervalRef.current) { clearInterval(vadIntervalRef.current); vadIntervalRef.current = null; }
    await stopSpeaking();
    setSpeakingId(null);
    if (isCurrentlyRecording()) { try { await stopRecording(); } catch {} }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <ChatBubble message={item} isSpeaking={speakingId === item.id} onSpeak={() => handleSpeak(item)} />
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>✨</Text>
      <Text style={styles.emptyTitle}>Explore Your Dreams</Text>
      <Text style={styles.emptySubtitle}>
        Ask about patterns, symbols, or recurring themes in your dream journal.
      </Text>
      <View style={styles.suggestions}>
        {[
          'What do I dream about most?',
          'Are there recurring themes?',
          'What does water mean in my dreams?',
        ].map((s) => (
          <Pressable key={s} style={styles.suggestion} onPress={() => setInputText(s)}>
            <Text style={styles.suggestionText}>{s}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const convPhaseLabel: Record<ConvPhase, string> = {
    listening: '🎤  Listening…',
    transcribing: '⚙️  Transcribing…',
    generating: '🤔  Thinking…',
    speaking: '🔊  Speaking…',
  };

  const showStreaming = isGenerating && streamingContent.length > 0;
  const isBusy = isGenerating || voiceState !== 'idle';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <StarField />

      {/* Focused dream banner */}
      {focusDream && (
        <View style={styles.contextBanner}>
          <View style={styles.contextBannerBody}>
            <Text style={styles.contextBannerLabel}>Focused on</Text>
            <Text style={styles.contextBannerTitle} numberOfLines={1}>
              {focusDream.title || 'Untitled Dream'}
            </Text>
            {focusDream.summary ? (
              <Text style={styles.contextBannerSummary} numberOfLines={2}>
                {focusDream.summary}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={() => setFocusDream(null)} hitSlop={12} style={styles.contextBannerDismiss}>
            <Text style={styles.contextBannerDismissText}>✕</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        extraData={speakingId}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          showStreaming ? (
            <StreamingBubble content={streamingContent} />
          ) : isGenerating ? (
            <View style={styles.thinkingIndicator}>
              <ActivityIndicator color={COLORS.lavender} size="small" />
              <Text style={styles.thinkingText}>Thinking…</Text>
            </View>
          ) : null
        }
        style={styles.list}
        contentContainerStyle={messages.length === 0 ? styles.emptyContainer : styles.listContent}
        onContentSizeChange={scrollToBottom}
      />

      {/* First-time guidance bubbles */}
      {showNux && !isConversing && (
        <Animated.View style={[styles.nuxContainer, { opacity: nuxFade }]}>
          <View style={styles.nuxHeader}>
            <Text style={styles.nuxLabel}>HOW TO CHAT</Text>
            <Pressable onPress={dismissNux} hitSlop={10}>
              <Text style={styles.nuxGotIt}>Got it ›</Text>
            </Pressable>
          </View>
          <View style={styles.nuxRow}>
            {/* Above 🎧 — left-aligned so bubble doesn't bleed off-screen */}
            <View style={styles.nuxColLeft}>
              <View style={styles.nuxBubble}>
                <Text style={styles.nuxBubbleTitle}>Voice chat</Text>
                <Text style={styles.nuxBubbleBody}>Hands-free{'\n'}conversation</Text>
              </View>
              <View style={[styles.nuxTail, styles.nuxTailLeft]} />
            </View>

            {/* Flex spacer — mirrors the TextInput */}
            <View style={{ flex: 1 }} />

            {/* Above 🎙 — centred over the button */}
            <View style={styles.nuxColCenter}>
              <View style={styles.nuxBubble}>
                <Text style={styles.nuxBubbleTitle}>Dictate</Text>
                <Text style={styles.nuxBubbleBody}>Voice to text</Text>
              </View>
              <View style={styles.nuxTail} />
            </View>

            {/* Above ↑ — right-aligned so bubble doesn't bleed off-screen */}
            <View style={styles.nuxColRight}>
              <View style={styles.nuxBubble}>
                <Text style={styles.nuxBubbleTitle}>Send</Text>
              </View>
              <View style={[styles.nuxTail, styles.nuxTailRight]} />
            </View>
          </View>
        </Animated.View>
      )}

      <View style={styles.inputRow}>
        {isConversing ? (
          <>
            <View style={styles.convStatus}>
              <Text style={styles.convStatusText}>{convPhaseLabel[convPhase]}</Text>
            </View>
            <Pressable style={styles.stopConvBtn} onPress={stopConversation}>
              <Text style={styles.stopConvBtnText}>✕ End</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              style={[styles.convBtn, isBusy && styles.btnDisabled]}
              onPress={startConversation}
              disabled={isBusy}
            >
              <Text style={styles.convBtnText}>🎧</Text>
            </Pressable>

            <TextInput
              ref={inputRef}
              style={[styles.input, voiceState === 'recording' && styles.inputRecording]}
              value={inputText}
              onChangeText={setInputText}
              placeholder={
                voiceState === 'recording' ? 'Listening… tap ⏹ to finish'
                  : voiceState === 'transcribing' ? 'Transcribing…'
                  : 'Ask about your dreams…'
              }
              placeholderTextColor={voiceState === 'recording' ? COLORS.rose : COLORS.textFaint}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
              editable={voiceState === 'idle'}
            />

            <Pressable
              style={[styles.micBtn, voiceState === 'recording' && styles.micBtnRecording]}
              onPress={handleVoicePress}
              disabled={voiceState === 'transcribing' || isGenerating}
            >
              {voiceState === 'transcribing' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.micBtnText}>{voiceState === 'recording' ? '⏹' : '🎙'}</Text>
              )}
            </Pressable>

            <Pressable
              style={[styles.sendBtn, (isBusy || !inputText.trim()) && styles.btnDisabled]}
              onPress={handleSend}
              disabled={isBusy || !inputText.trim()}
            >
              <Text style={styles.sendBtnText}>↑</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* History bottom sheet */}
      <Modal
        visible={showHistory}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHistory(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowHistory(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Chat History</Text>

            <Pressable style={styles.newChatRow} onPress={handleNewChat}>
              <Text style={styles.newChatText}>+ New Chat</Text>
            </Pressable>

            {openSessions.length === 0 ? (
              <Text style={styles.sheetEmpty}>No previous chats</Text>
            ) : (
              <ScrollView style={styles.sheetScroll} bounces={false}>
                {openSessions.map((s) => (
                  <Pressable
                    key={s.id}
                    style={styles.sessionRow}
                    onPress={() => handleLoadSession(s.id)}
                  >
                    <Text style={styles.sessionDate}>{formatSessionDate(s.updatedAt)}</Text>
                    <Text style={styles.sessionPreview} numberOfLines={1}>
                      {s.preview || 'Chat session'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  list: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listContent: {
    paddingVertical: 16,
    paddingBottom: 8,
  },
  emptyContainer: {
    flexGrow: 1,
  },

  // Header
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginRight: 18,
  },
  headerIcon: {
    fontSize: 18,
  },

  // Empty state
  empty: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: 18,
  },
  emptyTitle: {
    color: COLORS.textBright,
    fontFamily: FONTS.cinzel,
    fontSize: 20,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  emptySubtitle: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  suggestions: {
    gap: 8,
    width: '100%',
  },
  suggestion: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionText: {
    color: COLORS.textMid,
    fontFamily: FONTS.body,
    fontSize: 14,
    textAlign: 'center',
  },

  // Thinking
  thinkingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    marginLeft: 16,
  },
  thinkingText: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 13,
  },

  // Input row
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: COLORS.surfaceHigh,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
    alignItems: 'center',
  },

  // Context banner
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.teal + '44',
    borderTopWidth: 1,
    borderTopColor: COLORS.teal + '22',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  contextBannerBody: {
    flex: 1,
    gap: 2,
  },
  contextBannerLabel: {
    color: COLORS.teal,
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  contextBannerTitle: {
    color: COLORS.textBright,
    fontFamily: FONTS.bodySemi,
    fontSize: 14,
  },
  contextBannerSummary: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  contextBannerDismiss: {
    paddingTop: 2,
  },
  contextBannerDismissText: {
    color: COLORS.textDim,
    fontSize: 14,
  },

  // Conversation mode
  convStatus: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.lavenderMid,
  },
  convStatusText: {
    color: COLORS.lavender,
    fontFamily: FONTS.bodyMed,
    fontSize: 14,
  },
  stopConvBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.rose,
  },
  stopConvBtnText: {
    color: COLORS.rose,
    fontFamily: FONTS.bodyMed,
    fontSize: 13,
  },

  // Normal mode controls
  convBtn: {
    backgroundColor: COLORS.surface,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  convBtnText: {
    fontSize: 18,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.textBright,
    fontFamily: FONTS.body,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputRecording: {
    borderColor: COLORS.rose,
  },
  micBtn: {
    backgroundColor: COLORS.surface,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  micBtnRecording: {
    backgroundColor: COLORS.rose + '22',
    borderColor: COLORS.rose,
  },
  micBtnText: {
    fontSize: 18,
  },
  sendBtn: {
    backgroundColor: COLORS.lavenderDeep,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.lavender,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: FONTS.bodyBold,
  },

  // ─── NUX ──────────────────────────────────────────────────────────────────

  nuxContainer: {
    backgroundColor: COLORS.surfaceHigh,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 12,
  },
  nuxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  nuxLabel: {
    color: COLORS.lavenderMid,
    fontFamily: FONTS.cinzel,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  nuxGotIt: {
    color: COLORS.lavender,
    fontFamily: FONTS.bodySemi,
    fontSize: 13,
  },
  // The NUX row replicates the input row's flex layout so each column sits
  // directly above its corresponding button.
  nuxRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingBottom: 2,
  },
  // Left column (above 🎧): left-align the bubble so it doesn't clip off-screen
  nuxColLeft: {
    width: 42,
    alignItems: 'flex-start',
  },
  // Centre column (above 🎙): bubble naturally overflows symmetrically
  nuxColCenter: {
    width: 42,
    alignItems: 'center',
  },
  // Right column (above ↑): right-align so bubble doesn't clip off-screen
  nuxColRight: {
    width: 42,
    alignItems: 'flex-end',
  },
  nuxBubble: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.lavender + '40',
    paddingHorizontal: 9,
    paddingVertical: 7,
    // Soft glow matching the lavender palette
    shadowColor: COLORS.lavender,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  nuxBubbleTitle: {
    color: COLORS.textBright,
    fontFamily: FONTS.bodySemi,
    fontSize: 11,
    textAlign: 'center',
  },
  nuxBubbleBody: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 14,
  },
  // Downward-pointing triangle tail (matches bubble background)
  nuxTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.surface,
    alignSelf: 'center',
  },
  // Left-column tail: offset to centre over the 42 px button
  nuxTailLeft: {
    alignSelf: 'auto',
    marginLeft: 15,
  },
  // Right-column tail: mirror of left
  nuxTailRight: {
    alignSelf: 'auto',
    marginRight: 15,
  },

  // History modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: COLORS.surfaceHigh,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    color: COLORS.textBright,
    fontFamily: FONTS.cinzel,
    fontSize: 14,
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  newChatRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  newChatText: {
    color: COLORS.lavender,
    fontFamily: FONTS.bodySemi,
    fontSize: 15,
  },
  sheetEmpty: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sessionRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sessionDate: {
    color: COLORS.textDim,
    fontFamily: FONTS.bodyMed,
    fontSize: 11,
    marginBottom: 3,
  },
  sessionPreview: {
    color: COLORS.textMid,
    fontFamily: FONTS.body,
    fontSize: 14,
  },
});
