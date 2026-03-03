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
} from 'react-native';
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
import { useLocalSearchParams } from 'expo-router';
import { getDatabase } from '../../src/db/client';
import { dreams, Dream } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { COLORS, FONTS } from '../../src/theme';

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

const SILENCE_DB = -40;
const SILENCE_AFTER_SPEECH_MS = 1200;

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
  } = useChatStore();

  const [inputText, setInputText] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isConversing, setIsConversing] = useState(false);
  const [convPhase, setConvPhase] = useState<ConvPhase>('listening');
  const [focusDream, setFocusDream] = useState<Dream | null>(null);

  const { dreamId: dreamIdParam } = useLocalSearchParams<{ dreamId?: string }>();
  useEffect(() => {
    if (!dreamIdParam) { setFocusDream(null); return; }
    getDatabase()
      .select().from(dreams).where(eq(dreams.id, parseInt(dreamIdParam, 10)))
      .then(([row]) => { if (row) setFocusDream(row); })
      .catch(() => {});
  }, [dreamIdParam]);

  const pinnedContext = useMemo(
    () => (focusDream ? buildPinnedContext(focusDream) : undefined),
    [focusDream],
  );

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

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // ─── Manual send ──────────────────────────────────────────────────────────

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isGenerating || voiceState !== 'idle' || isConversing) return;

    setInputText('');
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
    addMessage(userMsg);
    setIsGenerating(true);
    scrollToBottom();

    try {
      await sendChatMessage(
        text,
        messages,
        (token) => { appendStreamToken(token); scrollToBottom(); },
        (response) => { finalizeStream(response); scrollToBottom(); },
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
        let silenceSince: number | null = null;

        const iv = setInterval(() => {
          if (!isConversingRef.current) {
            clearInterval(iv); vadIntervalRef.current = null; resolve(null); return;
          }
          const db = getMetering();
          if (db > SILENCE_DB) { hasSpeech = true; silenceSince = null; }
          else if (hasSpeech) {
            if (!silenceSince) { silenceSince = Date.now(); return; }
            if (Date.now() - silenceSince < SILENCE_AFTER_SPEECH_MS) return;
            clearInterval(iv); vadIntervalRef.current = null;
            setConvPhase('transcribing'); setVoiceState('transcribing');
            stopRecording()
              .then((r) => transcribeAudio(r.uri))
              .then((t) => resolve(t.text.trim() || null))
              .catch(() => resolve(null));
          }
        }, 100);

        vadIntervalRef.current = iv;
      }).catch(() => resolve(null));
    });

  const generateResponse = (text: string): Promise<string> =>
    new Promise((resolve, reject) => {
      const history = useChatStore.getState().messages;
      const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
      addMessage(userMsg);
      setIsGenerating(true);
      setConvPhase('generating');
      setVoiceState('idle');
      setInputText('');
      scrollToBottom();

      sendChatMessage(
        text,
        history,
        (token) => { appendStreamToken(token); scrollToBottom(); },
        (response) => { finalizeStream(response); scrollToBottom(); resolve(response); },
        pinnedContext,
      ).catch(reject);
    });

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
    setIsConversing(false);
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
});
