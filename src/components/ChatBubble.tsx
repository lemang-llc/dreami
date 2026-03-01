import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChatMessage } from '../llm/chat';

interface ChatBubbleProps {
  message: ChatMessage;
  isSpeaking?: boolean;
  onSpeak?: () => void;
}

export function ChatBubble({ message, isSpeaking = false, onSpeak }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
          {message.content}
        </Text>
      </View>

      <View style={styles.meta}>
        {/* Speaker button — only on assistant messages */}
        {!isUser && onSpeak && (
          <Pressable onPress={onSpeak} style={styles.speakBtn} hitSlop={8}>
            <Text style={[styles.speakIcon, isSpeaking && styles.speakIconActive]}>
              {isSpeaking ? '⏹' : '🔊'}
            </Text>
          </Pressable>
        )}
        <Text style={styles.time}>
          {new Date(message.timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
}

interface StreamingBubbleProps {
  content: string;
}

export function StreamingBubble({ content }: StreamingBubbleProps) {
  return (
    <View style={[styles.container, styles.assistantContainer]}>
      <View style={[styles.bubble, styles.assistantBubble]}>
        <Text style={[styles.text, styles.assistantText]}>
          {content}
          <Text style={styles.cursor}>▋</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    marginHorizontal: 16,
    maxWidth: '85%',
  },
  userContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#6c63ff',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#1a1a2e',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#2d2d4e',
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#ffffff',
  },
  assistantText: {
    color: '#e2e8f0',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    marginHorizontal: 4,
  },
  speakBtn: {
    padding: 2,
  },
  speakIcon: {
    fontSize: 13,
    opacity: 0.5,
  },
  speakIconActive: {
    opacity: 1,
  },
  time: {
    color: '#475569',
    fontSize: 11,
  },
  cursor: {
    color: '#a78bfa',
  },
});
