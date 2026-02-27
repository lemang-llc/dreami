import React, { useRef, useState, useCallback } from 'react';
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
} from 'react-native';
import { useChatStore } from '../../src/stores/chatStore';
import { ChatBubble, StreamingBubble } from '../../src/components/ChatBubble';
import { sendChatMessage, ChatMessage } from '../../src/llm/chat';

export default function ChatScreen() {
  const { messages, isGenerating, streamingContent, addMessage, appendStreamToken, finalizeStream, setIsGenerating } = useChatStore();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isGenerating) return;

    setInputText('');

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    addMessage(userMsg);
    setIsGenerating(true);
    scrollToBottom();

    try {
      let fullResponse = '';
      await sendChatMessage(
        text,
        messages,
        (token) => {
          appendStreamToken(token);
          fullResponse += token;
          scrollToBottom();
        },
        () => {
          finalizeStream(fullResponse);
          scrollToBottom();
        }
      );
    } catch (e) {
      finalizeStream('Sorry, something went wrong. Please try again.');
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <ChatBubble message={item} />
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
          <Pressable
            key={s}
            style={styles.suggestion}
            onPress={() => setInputText(s)}
          >
            <Text style={styles.suggestionText}>{s}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const showStreaming = isGenerating && streamingContent.length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          showStreaming ? (
            <StreamingBubble content={streamingContent} />
          ) : isGenerating ? (
            <View style={styles.thinkingIndicator}>
              <ActivityIndicator color="#a78bfa" size="small" />
              <Text style={styles.thinkingText}>Thinking...</Text>
            </View>
          ) : null
        }
        contentContainerStyle={
          messages.length === 0 ? styles.emptyContainer : styles.listContent
        }
        onContentSizeChange={scrollToBottom}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask about your dreams..."
          placeholderTextColor="#475569"
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <Pressable
          style={[styles.sendBtn, (!inputText.trim() || isGenerating) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isGenerating}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  listContent: {
    paddingVertical: 16,
    paddingBottom: 8,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#e2e8f0',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  suggestions: {
    gap: 8,
    width: '100%',
  },
  suggestion: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2d2d4e',
  },
  suggestionText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
  thinkingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    marginLeft: 16,
  },
  thinkingText: {
    color: '#475569',
    fontSize: 13,
  },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: '#0f0f1e',
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
    gap: 8,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#e2e8f0',
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#2d2d4e',
  },
  sendBtn: {
    backgroundColor: '#6c63ff',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
